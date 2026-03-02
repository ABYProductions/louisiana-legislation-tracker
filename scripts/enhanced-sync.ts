// scripts/enhanced-sync.ts
// Sync bills from the current Louisiana LegiScan session into Supabase.
// - Dynamically detects the current regular session
// - Fetches full getBill details for new/changed bills (not just master list summary)
// - Retry logic with exponential backoff for API failures
// - Does NOT overwrite summary or full_text (those are managed by generate-summaries.ts)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!
const LEGISCAN_BASE = 'https://api.legiscan.com/'

// ── LegiScan helpers ────────────────────────────────────────────────────────

async function legiscan(op: string, params: Record<string, string | number> = {}) {
  const url = new URL(LEGISCAN_BASE)
  url.searchParams.set('key', LEGISCAN_API_KEY)
  url.searchParams.set('op', op)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))

  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from LegiScan`)
  const data = await resp.json()
  if (data.status === 'ERROR') {
    throw new Error(`LegiScan API error: ${data.alert?.message || JSON.stringify(data)}`)
  }
  return data
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function retry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (attempt === retries) throw e
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`  Retry ${attempt + 1}/${retries} in ${delay}ms...`)
      await sleep(delay)
    }
  }
  throw new Error('unreachable')
}

// ── Session detection ────────────────────────────────────────────────────────

async function getCurrentSession() {
  const data = await legiscan('getSessionList', { state: 'LA' })
  const sessions: any[] = data.sessions
  const year = new Date().getFullYear()

  // Prefer current year's regular (non-special) session
  const session =
    sessions.find(s => s.special === 0 && (s.year_start === year || s.year_end === year)) ??
    sessions.find(s => s.year_end >= year)

  if (!session) throw new Error('Could not find current Louisiana session')
  console.log(`Session: ${session.session_name} (ID: ${session.session_id})`)
  return session
}

// ── Main sync ────────────────────────────────────────────────────────────────

async function enhancedSync() {
  console.log('=== Enhanced Bill Sync ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('')

  // 1. Detect current session
  const session = await getCurrentSession()

  // 2. Fetch master list for that session
  const masterData = await retry(() => legiscan('getMasterList', { id: session.session_id }))
  const masterList: any[] = Object.values(masterData.masterlist).filter(
    (b: any) => b && typeof b === 'object' && b.bill_id
  )
  console.log(`LegiScan: ${masterList.length} bills in session`)

  // 2b. Self-heal: ensure all bills in this session_id have the correct session_year.
  // Bills synced by the original sync-legiscan.ts script before Jan 1 of the session year
  // may have stored session_year = (previous year) due to Date.getFullYear() at sync time.
  // This update is idempotent — a no-op after the first run.
  const { error: fixErr } = await supabase
    .from('Bills')
    .update({ session_year: session.year_start })
    .eq('session_id', session.session_id)
    .neq('session_year', session.year_start)
  if (fixErr) {
    console.warn(`  session_year fix warning: ${fixErr.message}`)
  } else {
    console.log(`  session_year self-heal complete (${session.year_start})`)
  }

  // 3. Load existing DB records (legiscan_bill_id → {change_hash, last_action_date})
  // limit(2000) guards against Supabase's default 1000-row cap as bill count grows
  const { data: existing, error: dbErr } = await supabase
    .from('Bills')
    .select('legiscan_bill_id, change_hash, last_action_date')
    .limit(2000)
  if (dbErr) throw new Error(`DB read failed: ${dbErr.message}`)

  const existingMap = new Map((existing || []).map(b => [b.legiscan_bill_id, b]))
  console.log(`Database: ${existingMap.size} bills currently stored`)

  // 4. Determine which bills need work
  const toUpdate = masterList.filter(b => existingMap.get(b.bill_id)?.change_hash !== b.change_hash)
  const skipped = masterList.length - toUpdate.length
  console.log(`To sync: ${toUpdate.length} | Unchanged: ${skipped}`)
  console.log('---')

  let inserted = 0
  let updated = 0
  let errors = 0

  // 5. Process each bill that needs updating
  for (const billSummary of toUpdate) {
    const isNew = !existingMap.has(billSummary.bill_id)
    const label = billSummary.number || `bill_id=${billSummary.bill_id}`

    try {
      // Fetch full bill detail from LegiScan
      const detail = await retry(() => legiscan('getBill', { id: billSummary.bill_id }))
      const b = detail.bill

      // Find the most recent history entry (LegiScan orders oldest-first)
      const history = b.history || []
      const latestHistory = history.length > 0 ? history[history.length - 1] : null
      const texts = b.texts || []

      // Determine sync_priority based on recency of last action.
      // 'high' bills are re-fetched on every sync run (6-hour intervals during session).
      // Summary reset is now driven by pdf_text_hash change in extract-bill-text.ts,
      // not by LegiScan change_hash alone.
      const lastActionDate = latestHistory?.date ?? null
      const daysSinceAction = lastActionDate
        ? Math.floor((Date.now() - new Date(lastActionDate).getTime()) / 86_400_000)
        : 999
      const syncPriority = daysSinceAction <= 7 ? 'high'
        : daysSinceAction <= 30 ? 'normal'
        : 'low'

      // Store LegiScan text docs as backup metadata (doc_id + mime_type — NOT the full text content).
      // Full text sourcing is handled exclusively by extract-bill-text.ts via PDF.
      const legiscanTextBackup = JSON.stringify(
        texts.map((t: any) => ({ doc_id: t.doc_id, type: t.type, date: t.date, mime: t.mime }))
      )

      const { error } = await supabase.from('Bills').upsert(
        {
          legiscan_bill_id:     b.bill_id,
          bill_number:          b.bill_number,
          title:                b.title,
          description:          b.description || b.title,
          session_id:           session.session_id,
          session_year:         session.year_start,
          body:                 b.body,
          body_id:              b.body_id,
          current_body:         b.current_body,
          current_body_id:      b.current_body_id,
          bill_type:            b.bill_type,
          bill_type_id:         b.bill_type_id,
          status:               b.status_desc || String(b.status),
          state_link:           b.state_link,
          url:                  b.url,
          change_hash:          b.change_hash,
          committee:            b.committee?.name || null,
          last_action:          latestHistory?.action || null,
          last_action_date:     lastActionDate,
          last_legiscan_action: latestHistory?.action || null,
          author:               b.sponsors?.[0]?.name || null,
          sponsors:             b.sponsors || [],
          history,
          votes:                b.votes || [],
          amendments:           b.amendments || [],
          texts,
          calendar:             b.calendar || [],
          subjects:             b.subjects || [],
          sync_priority:        syncPriority,
          legiscan_text_backup: legiscanTextBackup,
          updated_at:           new Date().toISOString(),
          // NOTE: summary, full_text, abstract, digest, and summary_status are
          // managed exclusively by extract-bill-text.ts and generate-summaries.ts.
          // LegiScan sync NEVER overwrites those columns.
        },
        { onConflict: 'legiscan_bill_id' }
      )

      if (error) {
        console.error(`  ✗ ${label}: ${error.message}`)
        errors++
      } else {
        console.log(`  ${isNew ? '+' : '~'} ${b.bill_number} [${syncPriority}] (${b.title?.slice(0, 55)})`)
        isNew ? inserted++ : updated++
      }
    } catch (e: any) {
      console.error(`  ✗ ${label}: ${e.message}`)
      errors++
    }

    // Rate limit: be respectful to the LegiScan API
    await sleep(350)
  }

  console.log('---')
  console.log('Sync complete!')
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Errors:   ${errors}`)
  console.log(`  Total:    ${masterList.length}`)

  if (errors > 0) {
    // Warn but don't exit(1) — partial failures are retried on next run
    // (change_hash won't match until the bill is successfully synced)
    console.warn(`\nWARNING: ${errors} bill(s) failed to sync and will be retried next run.`)
  }
}

enhancedSync().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
