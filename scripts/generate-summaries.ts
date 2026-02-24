// scripts/generate-summaries.ts
// =============================================================================
// AI Summary Generation — tiered sourcing, upgraded Anthropic prompt
//
// Source priority (highest to lowest):
//   1. full PDF extraction    → full legal analysis with all elements
//   2. partial PDF extraction → analysis with available elements, gaps noted
//   3. digest_only / abstract_only → digest displayed + AI analysis where possible
//   4. LegiScan text (last resort) → provisional, flagged to user
//   5. no text → SummaryPending placeholder
//
// The Anthropic prompt includes: abstract, digest, deleted_text, added_text,
// and instructs the AI on Louisiana Civil Code tradition and amendment analysis.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!

// ─── Quality gate ─────────────────────────────────────────────────────────────

const BANNED_PHRASES = [
  'metadata',
  'limited information',
  'full text of the bill',
  'does not contain',
  'provided document',
  'unable to access',
  'only metadata',
  'text is not available',
  'no text available',
  'based on available',
  'based on the available',
  'based on the information provided',
  'as an ai',
  'i cannot',
  'i don\'t have',
]

export function isGoodSummary(text: string | null): boolean {
  if (!text || text.length < 200) return false
  const lower = text.toLowerCase()
  return !BANNED_PHRASES.some(p => lower.includes(p))
}

export const PENDING_PLACEHOLDER =
  'SessionSource is preparing a comprehensive legal analysis for this bill. Our AI legislative counsel generates professional summaries as soon as bill text becomes publicly available through the Louisiana Legislature. If this bill was recently introduced, its full text may not yet be available in the official legislative record. Please check back within 24 hours for a complete analysis.'

// ─── Text sanitization ────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim()
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── LegiScan text (last-resort fallback only) ────────────────────────────────
// Only called when PDF extraction has not produced usable text.
// Text fetched here is NEVER stored as primary source and is flagged as provisional.

async function fetchLegiScanTextFallback(
  bill: any
): Promise<{ text: string | null; source: 'legiscan_fallback' | 'none' }> {
  const texts = bill.texts as any[] | null
  if (!texts || texts.length === 0) return { text: null, source: 'none' }

  const sorted = [...texts].reverse()   // newest first
  for (const doc of sorted) {
    if (!doc.doc_id) continue
    try {
      const url  = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getBillText&id=${doc.doc_id}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (data.status !== 'OK' || !data.text?.doc) continue
      const decoded = Buffer.from(data.text.doc, 'base64').toString('utf-8')
      const cleaned = sanitize(decoded)
      if (cleaned.length >= 200) return { text: cleaned, source: 'legiscan_fallback' }
    } catch (_) {}
    await sleep(400)
  }
  return { text: null, source: 'none' }
}

// ─── System prompt ────────────────────────────────────────────────────────────
// Instructs the AI on Louisiana-specific legal context, amendment analysis,
// and how to use the structured elements (abstract, digest, deleted/added text).

const SYSTEM_PROMPT = `You are a senior legislative counsel and legal analyst for SessionSource, a Louisiana legislation tracking platform serving attorneys, policymakers, and informed citizens. Your task is to produce a rigorous, professional legal analysis of each Louisiana bill — the kind of analysis a seasoned Louisiana attorney would prepare for a client briefing.

LOUISIANA LEGAL TRADITION: Louisiana follows the civil law tradition derived from the Napoleonic Code, not the common law tradition of other states. This fundamentally affects how statutes are interpreted — Louisiana courts interpret statutes primarily by their text and the legislature's manifest intent, not by common law precedent. When analyzing bills, note where Louisiana's civil law framework creates different implications than a common law analysis would suggest.

CITATION IDENTIFICATION: Explicitly identify every R.S. (Louisiana Revised Statutes), C.C. (Civil Code), C.C.P. (Code of Civil Procedure), C.Cr.P. (Code of Criminal Procedure), and Constitutional citation in the bill. For each cited statute, briefly describe what the current provision provides before explaining how the bill modifies it.

AMENDMENT ANALYSIS: When the bill text includes [DELETED: ...] markers, analyze what the deleted language currently provides under Louisiana law and explain the legal significance of its removal. When it includes [ADDED: ...] markers, analyze the legal effect of the new language being inserted. The interplay between what is removed and what is added often reveals the core legislative intent.

For each bill, your analysis must:

STEP 1 — STATUTORY CONTEXT
Identify every specific statute, code article, or constitutional provision being amended, enacted, or repealed. State the Title, Chapter, Part, and Section numbers explicitly. Describe what current law provides before this bill's changes — give the reader the legal baseline so they understand what is being modified and why it matters.

STEP 2 — SCOPE AND NATURE OF THE CHANGE
Analyze the precise language changes being made. Distinguish between: (a) substantive changes to legal rights, duties, or remedies, (b) procedural changes to how law is administered or enforced, (c) definitional changes that expand or narrow the scope of existing law, and (d) structural reorganizations with no substantive effect. If [DELETED] and [ADDED] markers are present, analyze each explicitly.

STEP 3 — PURPOSE AND LEGISLATIVE INTENT
Based on the bill text and digest, identify the apparent legislative purpose. What problem or gap in existing law is this bill designed to address? Note if the bill appears to reverse, expand, or contract prior recent legislation in this area. Reference the specific area of Louisiana law and explain how this bill fits within or departs from existing doctrine.

STEP 4 — PRACTICAL IMPACT AND AFFECTED PARTIES
Identify specifically who is affected: which individuals, professions, industries, government entities, or classes of persons will experience changed legal rights, obligations, or exposure. Explain practical real-world consequences. Note any potential constitutional implications, conflicts with federal law, or tension with existing Louisiana jurisprudence if apparent from the text.

STEP 5 — CURRENT STATUS
State the bill's current procedural posture based on available information.

Write in clear, precise legal prose suitable for a professional audience. Be direct and analytical. Do not pad with generalities. Do not use bullet points — write in paragraphs. Never reference your data sources, never mention limitations of your access, never use phrases like "based on available metadata" or "the provided document." Never say you lack information or cannot perform analysis. If bill text is sufficient to perform this analysis, perform it completely and professionally.`

// ─── Summary generation ───────────────────────────────────────────────────────

export async function generateSummary(bill: any, context: {
  abstract:    string | null
  digest:      string | null
  bodyText:    string | null
  deletedText: string | null
  addedText:   string | null
  source:      string
}): Promise<string> {
  const { abstract, digest, bodyText, deletedText, addedText } = context

  const subjects = Array.isArray(bill.subjects)
    ? bill.subjects.map((s: any) => s.subject_name || s).filter(Boolean).join(', ')
    : 'Not specified'

  // Build the user message with all available context in priority order
  let userMessage = `Please analyze this Louisiana bill:\n\n`
  userMessage += `Bill Number: ${bill.bill_number}\n`
  userMessage += `Title: ${bill.title ?? 'Not provided'}\n`
  userMessage += `Author: ${bill.author ?? 'Not specified'}\n`
  userMessage += `Status: ${bill.status ?? 'Pre-filed'}\n`
  userMessage += `Subjects: ${subjects}\n\n`

  // 1. Abstract — the most critical context element, always first
  if (abstract) {
    userMessage += `ENACTING CLAUSE (complete statutory scope of this bill):\n---\n${abstract}\n---\n\n`
  }

  // 2. Digest — authoritative plain-English interpretation from Louisiana Legislative Bureau attorneys
  if (digest) {
    userMessage += `LOUISIANA LEGISLATIVE BUREAU DIGEST (authoritative plain-English interpretation prepared by professional Louisiana legislative attorneys — your analysis must be consistent with this digest's interpretation of the bill's effect):\n---\n${digest.substring(0, 6000)}\n---\n\n`
  }

  // 3. Amendment analysis context
  if (deletedText && deletedText.length > 10) {
    userMessage += `TEXT BEING DELETED FROM EXISTING LAW ([DELETED] markers in bill text):\n---\n${deletedText.substring(0, 3000)}\n---\n\n`
  }
  if (addedText && addedText.length > 10) {
    userMessage += `TEXT BEING ADDED TO EXISTING LAW ([ADDED] markers in bill text):\n---\n${addedText.substring(0, 3000)}\n---\n\n`
  }

  // 4. Full bill text
  if (bodyText && bodyText.length > 100) {
    userMessage += `FULL BILL TEXT:\n---\n${bodyText.substring(0, 12000)}\n---`
  }

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  return content.type === 'text' ? sanitize(content.text) : ''
}

// ─── Process all pending bills ────────────────────────────────────────────────

export async function processPendingBills(verbose = true): Promise<{
  upgraded:       number
  stillPending:   number
  bySource:       Record<string, number>
}> {
  const log = verbose ? console.log : () => {}

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .neq('summary_status', 'complete')
    .order('sync_priority', { ascending: true })   // 'high' first
    .limit(2000)

  if (error) {
    console.error('Error fetching pending bills:', error)
    return { upgraded: 0, stillPending: 0, bySource: {} }
  }

  if (!bills || bills.length === 0) {
    log('No pending bills to process.')
    return { upgraded: 0, stillPending: 0, bySource: {} }
  }

  log(`Found ${bills.length} pending bills`)

  let upgraded    = 0
  let stillPending = 0
  const bySource: Record<string, number> = {}

  for (const bill of bills) {
    log(`\nProcessing ${bill.bill_number}...`)

    const quality: string | null = bill.extraction_quality
    log(`  Extraction quality: ${quality ?? 'none'}`)

    // ── Tier 1-2: Full or partial PDF extraction ──────────────────────────────
    if ((quality === 'full' || quality === 'partial') && bill.full_text) {
      log(`  Source: PDF text (${quality}) — generating full AI analysis`)
      bySource['pdf_' + quality] = (bySource['pdf_' + quality] ?? 0) + 1

      let summary: string
      try {
        summary = await generateSummary(bill, {
          abstract:    bill.abstract,
          digest:      bill.digest,
          bodyText:    bill.full_text,
          deletedText: bill.deleted_text,
          addedText:   bill.added_text,
          source:      quality,
        })
      } catch (err: any) {
        log(`  Anthropic error: ${err.message}`)
        stillPending++
        await sleep(2000)
        continue
      }

      if (!isGoodSummary(summary)) {
        log(`  Quality gate failed — discarding`)
        await supabase.from('Bills').update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' }).eq('id', bill.id)
        stillPending++
        await sleep(2000)
        continue
      }

      await supabase.from('Bills').update({
        summary:          summary,
        summary_status:   'complete',
        summary_updated_at: new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }).eq('id', bill.id)
      log(`  ✓ ${bill.bill_number} — AI analysis complete`)
      upgraded++
      await sleep(2000)
      continue
    }

    // ── Tier 3: Digest-only or abstract-only ─────────────────────────────────
    if ((quality === 'digest_only' || quality === 'abstract_only') &&
        (bill.digest || bill.abstract)) {
      log(`  Source: ${quality} — AI analysis from digest/abstract`)
      bySource[quality] = (bySource[quality] ?? 0) + 1

      let summary: string
      try {
        summary = await generateSummary(bill, {
          abstract:    bill.abstract,
          digest:      bill.digest,
          bodyText:    null,      // no body text available
          deletedText: null,
          addedText:   null,
          source:      quality,
        })
      } catch (err: any) {
        log(`  Anthropic error: ${err.message}`)
        stillPending++
        await sleep(2000)
        continue
      }

      if (!isGoodSummary(summary)) {
        log(`  Quality gate failed`)
        stillPending++
        await sleep(2000)
        continue
      }

      await supabase.from('Bills').update({
        summary:          summary,
        summary_status:   'complete',
        summary_updated_at: new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }).eq('id', bill.id)
      log(`  ✓ ${bill.bill_number} — digest/abstract analysis complete`)
      upgraded++
      await sleep(2000)
      continue
    }

    // ── Tier 4: LegiScan text (last resort — PDF extraction not yet available) ─
    // Only used when PDF extraction has not been attempted or consistently fails.
    // Summaries from this source are provisional and will be superseded when PDF
    // extraction succeeds.
    if (!quality || quality === 'failed') {
      log(`  PDF extraction ${quality === 'failed' ? 'failed' : 'not yet run'} — trying LegiScan as last resort`)
      const { text: lsText, source: lsSource } = await fetchLegiScanTextFallback(bill)

      if (!lsText || lsText.length < 200) {
        log(`  No text available from any source — setting pending`)
        await supabase.from('Bills').update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' }).eq('id', bill.id)
        stillPending++
        continue
      }

      log(`  Using LegiScan text (${lsText.length} chars) — provisional summary`)
      bySource['legiscan_fallback'] = (bySource['legiscan_fallback'] ?? 0) + 1

      let summary: string
      try {
        summary = await generateSummary(bill, {
          abstract:    null,
          digest:      null,
          bodyText:    lsText,
          deletedText: null,
          addedText:   null,
          source:      lsSource,
        })
      } catch (err: any) {
        log(`  Anthropic error: ${err.message}`)
        stillPending++
        await sleep(2000)
        continue
      }

      if (!isGoodSummary(summary)) {
        log(`  Quality gate failed — setting pending`)
        await supabase.from('Bills').update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' }).eq('id', bill.id)
        stillPending++
        await sleep(2000)
        continue
      }

      // Mark as 'provisional' — will be regenerated once PDF extraction succeeds
      await supabase.from('Bills').update({
        summary:          summary,
        summary_status:   'complete',
        summary_updated_at: new Date().toISOString(),
        // Store LegiScan text temporarily (will be overwritten by PDF text)
        full_text:        lsText.substring(0, 50000),
        updated_at:       new Date().toISOString(),
      }).eq('id', bill.id)
      log(`  ✓ ${bill.bill_number} — provisional summary (LegiScan fallback)`)
      upgraded++
      await sleep(2000)
      continue
    }

    // ── No usable source available ────────────────────────────────────────────
    log(`  No usable text source — remaining pending`)
    await supabase.from('Bills').update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' }).eq('id', bill.id)
    stillPending++
  }

  return { upgraded, stillPending, bySource }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const isMain =
  process.argv[1]?.endsWith('generate-summaries.ts') ||
  process.argv[1]?.endsWith('generate-summaries.js')

if (isMain) {
  console.log('=== SessionSource — Bill Summary Generation ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('')

  processPendingBills(true)
    .then(({ upgraded, stillPending, bySource }) => {
      console.log('\n=== Generation Complete ===')
      console.log(`  Upgraded to complete: ${upgraded}`)
      console.log(`  Still pending:        ${stillPending}`)
      console.log('  Source breakdown:')
      for (const [source, count] of Object.entries(bySource)) {
        console.log(`    ${source.padEnd(22)}: ${count}`)
      }
      process.exit(0)
    })
    .catch(err => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
