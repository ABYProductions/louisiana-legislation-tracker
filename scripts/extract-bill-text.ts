// scripts/extract-bill-text.ts
// =============================================================================
// PDF Extraction Pipeline — primary text source for Louisiana bill analysis
//
// Architecture:
//   Claude PDF API (primary) → sends raw PDF bytes; gets clean structured text
//   crypto (built-in)        → SHA-256 hash for change detection
//
// PDF URL pattern: https://legis.la.gov/Legis/ViewDocument.aspx?d={docId}
//   docId discovered by scraping BillInfo page; cached in pdf_url column.
//
// Rate limiting: 1500ms delay between fetches, max 40 PDFs/hour (raise to 500 for bulk loads).
// Retries: up to 3 attempts with 5s / 15s / 45s exponential backoff.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'

// ── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── Constants ────────────────────────────────────────────────────────────────

const UA              = 'SessionSource-Louisiana/1.0 (public legislative transparency project; non-commercial; contact via legis.la.gov)'
let FETCH_DELAY_MS  = 1500
let MAX_PER_HOUR    = 40
const MAX_RETRIES     = 3
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000]

// ── Citation patterns ─────────────────────────────────────────────────────────

const RS_CITATION_RE = /R\.S\.\s+\d+:\d+/g
const CC_CITATION_RE = /C\.C\.\s+Art\.\s+\d+/gi

// ── Types ────────────────────────────────────────────────────────────────────

type ExtractionQuality = 'full' | 'partial' | 'digest_only' | 'abstract_only' | 'failed'

interface ClaudeExtraction {
  fullText:      string
  abstract:      string | null
  digest:        string | null
  deletedText:   string | null
  addedText:     string | null
  hasFormatting: boolean
  pageCount:     number
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWithRetry(url: string, opts: RequestInit = {}, label = ''): Promise<Response | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': UA, ...(opts.headers ?? {}) },
        signal:  AbortSignal.timeout(60_000),
      })
      if (resp.status === 429) { console.warn(`    429 — backing off 120s (${label})`); await sleep(120_000); continue }
      if (resp.status === 503) { console.warn(`    503 — backing off 60s (${label})`);  await sleep(60_000);  continue }
      if (resp.status === 404) { console.warn(`    404: ${url}`); return null }
      if (!resp.ok) {
        if (attempt < MAX_RETRIES - 1) { console.warn(`    HTTP ${resp.status} (${label}) — retry ${attempt + 1}`); await sleep(RETRY_DELAYS_MS[attempt]) }
        continue
      }
      return resp
    } catch (e: any) {
      if (attempt < MAX_RETRIES - 1) { console.warn(`    Fetch error (${label}, attempt ${attempt + 1}): ${e.message}`); await sleep(RETRY_DELAYS_MS[attempt]) }
    }
  }
  return null
}

// ── PDF URL discovery ─────────────────────────────────────────────────────────
// Scrapes the BillInfo page to find the primary ViewDocument.aspx?d=NNN link.

async function discoverPdfUrl(
  bill: { bill_number: string; state_link: string | null }
): Promise<string | null> {
  const billNum = (bill.bill_number ?? '').replace(/\s+/g, '')
  if (!billNum) return null

  let billInfoUrl: string
  if (bill.state_link?.includes('legis.la.gov/legis/BillInfo')) {
    billInfoUrl = bill.state_link
  } else {
    const sessionMatch = bill.state_link?.match(/[?&]s=(\d+RS)/i)
    const session = sessionMatch?.[1]?.toUpperCase() ?? '26RS'
    billInfoUrl = `https://legis.la.gov/legis/BillInfo.aspx?s=${session}&b=${billNum}&sbi=y`
  }

  const resp = await fetchWithRetry(billInfoUrl, { headers: { Accept: 'text/html' } }, `BillInfo:${billNum}`)
  if (!resp) return null
  const html = await resp.text()

  const viewMatch = html.match(/ViewDocument\.aspx\?d=(\d+)/i)
  if (viewMatch) return `https://legis.la.gov/Legis/ViewDocument.aspx?d=${viewMatch[1]}`

  const pdfMatch = html.match(/href="([^"]*\.pdf[^"]*)"/i)
  if (pdfMatch) {
    const href = pdfMatch[1]
    return href.startsWith('http') ? href : `https://legis.la.gov${href}`
  }

  return null
}

// ── Claude PDF extraction ─────────────────────────────────────────────────────
// Sends PDF bytes directly to Claude. Claude reads the document natively and
// returns a structured JSON object with clean text and formatting analysis.
// This bypasses all local library font/encoding issues that plagued pdfjs-dist.

const EXTRACTION_PROMPT = `You are extracting content from a Louisiana Legislature bill PDF for a public legislative tracking system.

Extract and return a JSON object with exactly these fields:
- "full_text": Complete bill text, clean and readable. Exclude left-margin line numbers (digits 1-99 at line start), repeating page headers/footers, and the standalone "DIGEST" heading word.
- "abstract": The introductory clause — starts with "AN ACT to...", "A CONCURRENT RESOLUTION to...", or similar, and ends with "...and to provide for related matters." Return null if not found.
- "digest": The Legislative Bureau digest — appears at the END of the document after a "DIGEST" heading, written by legislative attorneys explaining the bill's effect using "present law" and "proposed law" language. Return null if not present (early-session bills often have no digest yet).
- "deleted_text": Text being removed from current law, shown with strikethrough formatting in the PDF. Return null if none.
- "added_text": New text being added to law, shown with underline formatting in the PDF. Return null if none.
- "has_formatting": true if the bill shows tracked changes (strikethrough and/or underline indicating amendments to existing statutes), false otherwise.
- "page_count": total number of pages in the document.

Return ONLY a valid JSON object. No surrounding text, no markdown code fences.`

async function extractWithClaude(pdfBuffer: Buffer): Promise<ClaudeExtraction> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: [
        {
          type:   'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
        } as any,
        { type: 'text', text: EXTRACTION_PROMPT },
      ],
    }],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch    = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Claude returned non-JSON response: ${responseText.substring(0, 200)}`)

  const ex = JSON.parse(jsonMatch[0])
  return {
    fullText:      ex.full_text      ?? '',
    abstract:      ex.abstract       ?? null,
    digest:        ex.digest         ?? null,
    deletedText:   ex.deleted_text   ?? null,
    addedText:     ex.added_text     ?? null,
    hasFormatting: ex.has_formatting ?? false,
    pageCount:     ex.page_count     ?? 1,
  }
}

// ── Extraction quality scoring ─────────────────────────────────────────────────

function scoreExtraction(params: {
  abstract:           string | null
  digest:             string | null
  bodyText:           string
  formattingDetected: boolean
  rsCitationCount:    number
  notes:              string[]
}): ExtractionQuality {
  const { abstract, digest, bodyText, formattingDetected, rsCitationCount } = params

  if (!abstract && !digest && bodyText.length < 200) return 'failed'
  if (bodyText.length < 200 && !digest)              return 'failed'

  // Full: substantive body text + either (digest + citations) or formatting detected
  if (abstract && digest && bodyText.length > 1000 && rsCitationCount > 0)  return 'full'
  if (abstract && digest && bodyText.length > 1000 && formattingDetected)   return 'full'

  if (digest && bodyText.length < 200) return 'digest_only'
  if (abstract && !digest && bodyText.length < 200) return 'abstract_only'

  return 'partial'
}

// ── Single bill processing ─────────────────────────────────────────────────────

async function processBill(bill: any): Promise<{
  quality:            ExtractionQuality | 'skipped'
  formattingDetected: boolean
  rsCitations:        number
  abstractLen:        number
  digestLen:          number
  notes:              string[]
}> {
  const label = bill.bill_number ?? `id=${bill.id}`
  console.log(`\n  Processing ${label}...`)
  const notes: string[] = []

  // ── Step 1: Resolve PDF URL ─────────────────────────────────────────────────
  let pdfUrl: string | null = bill.pdf_url ?? null
  if (!pdfUrl) {
    await sleep(FETCH_DELAY_MS)
    pdfUrl = await discoverPdfUrl(bill)
    if (!pdfUrl) {
      console.log(`    PDF URL not found`)
      await supabase.from('Bills').update({
        extraction_quality:    'failed',
        extraction_notes:      'PDF URL not found on BillInfo page',
        text_last_verified_at: new Date().toISOString(),
      }).eq('id', bill.id)
      return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['PDF URL not found'] }
    }
    console.log(`    PDF URL: ${pdfUrl}`)
  }

  // ── Step 2: Fetch PDF ───────────────────────────────────────────────────────
  await sleep(FETCH_DELAY_MS)
  console.log(`    Fetching PDF...`)
  const pdfResp = await fetchWithRetry(pdfUrl, { headers: { Accept: 'application/pdf,*/*' } }, label)
  if (!pdfResp) {
    await supabase.from('Bills').update({
      extraction_quality:    'failed',
      extraction_notes:      `PDF fetch failed after ${MAX_RETRIES} retries`,
      pdf_url:               pdfUrl,
      text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['PDF fetch failed'] }
  }

  const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer())
  if (pdfBuffer.length < 500) {
    notes.push('PDF too small — likely error response page')
    await supabase.from('Bills').update({
      extraction_quality: 'failed', extraction_notes: notes.join('; '),
      pdf_url: pdfUrl, text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes }
  }
  console.log(`    PDF fetched: ${(pdfBuffer.length / 1024).toFixed(0)} KB`)

  // ── Step 3: Hash for change detection ──────────────────────────────────────
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')

  if (
    bill.pdf_text_hash === pdfHash &&
    bill.extraction_quality &&
    bill.extraction_quality !== 'failed'
  ) {
    console.log(`    PDF unchanged (hash match) — updating verification timestamp only`)
    await supabase.from('Bills').update({ text_last_verified_at: new Date().toISOString() }).eq('id', bill.id)
    return { quality: 'skipped', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['hash_match_skip'] }
  }

  // ── Step 4: Claude PDF extraction ──────────────────────────────────────────
  console.log(`    Extracting with Claude PDF API...`)
  let extraction: ClaudeExtraction
  try {
    extraction = await extractWithClaude(pdfBuffer)
    console.log(`    Claude: ${extraction.pageCount} pages, ${extraction.fullText.length} chars, formatting=${extraction.hasFormatting}`)
  } catch (e: any) {
    notes.push(`Claude extraction error: ${e.message}`)
    console.warn(`    Claude extraction failed: ${e.message}`)
    await supabase.from('Bills').update({
      extraction_quality:    'failed',
      extraction_notes:      notes.join('; '),
      pdf_url:               pdfUrl,
      pdf_text_hash:         pdfHash,
      text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes }
  }

  const { fullText, abstract, digest, deletedText, addedText, hasFormatting } = extraction
  const formattingDetected = hasFormatting

  if (fullText.length < 200 && !abstract && !digest) {
    notes.push('Claude returned insufficient text')
    await supabase.from('Bills').update({
      extraction_quality:    'failed',
      extraction_notes:      notes.join('; '),
      pdf_url:               pdfUrl,
      pdf_text_hash:         pdfHash,
      text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected, rsCitations: 0, abstractLen: 0, digestLen: 0, notes }
  }

  console.log(`    Abstract: ${abstract ? abstract.length + ' chars' : 'NOT FOUND'}`)
  console.log(`    Digest:   ${digest   ? digest.length   + ' chars' : 'NOT FOUND'}`)
  if (!abstract) notes.push('ABSTRACT_NOT_FOUND')
  if (!digest)   notes.push('DIGEST_NOT_FOUND')
  if (!formattingDetected) notes.push('NO_FORMATTING_DETECTED')

  // ── Step 5: Citation validation ────────────────────────────────────────────
  const rsCitations = (fullText.match(RS_CITATION_RE) ?? []).length
  const ccCitations = (fullText.match(CC_CITATION_RE) ?? []).length
  console.log(`    Citations: ${rsCitations} R.S., ${ccCitations} C.C.`)

  // ── Step 6: Quality score ──────────────────────────────────────────────────
  const quality = scoreExtraction({ abstract, digest, bodyText: fullText, formattingDetected, rsCitationCount: rsCitations, notes })
  console.log(`    Quality: ${quality}`)

  // ── Step 7: Amendment detection ─────────────────────────────────────────────
  const isAmendment = bill.pdf_text_hash && bill.pdf_text_hash !== pdfHash &&
                      bill.summary_status === 'complete' && bill.summary
  if (isAmendment) {
    notes.push('AMENDMENT_DETECTED — previous summary archived')
    console.log(`    Amendment detected — archiving previous summary`)
  }

  // ── Step 8: Database update ────────────────────────────────────────────────
  const updateData: Record<string, any> = {
    pdf_url:               pdfUrl,
    pdf_text_hash:         pdfHash,
    full_text:             fullText.substring(0, 100_000),
    abstract,
    digest,
    deleted_text:          deletedText ? deletedText.substring(0, 50_000) : null,
    added_text:            addedText   ? addedText.substring(0, 50_000)   : null,
    extraction_quality:    quality,
    extraction_notes:      notes.length > 0 ? notes.join('; ') : null,
    text_last_verified_at: new Date().toISOString(),
  }

  if (isAmendment) {
    updateData.previous_summary   = bill.summary
    updateData.summary_status     = 'pending'
    updateData.summary_updated_at = new Date().toISOString()
  } else if (quality !== 'failed' && bill.summary_status !== 'complete') {
    updateData.summary_status = 'pending'
  }

  const { error } = await supabase.from('Bills').update(updateData).eq('id', bill.id)
  if (error) {
    console.error(`    DB update error: ${error.message}`)
    notes.push(`DB_ERROR: ${error.message}`)
  } else {
    console.log(`    ✓ ${label} saved (${quality})`)
  }

  return { quality, formattingDetected, rsCitations, abstractLen: abstract?.length ?? 0, digestLen: digest?.length ?? 0, notes }
}

// ── Test mode (20 bills — 10H, 10S, 2 HCR) ────────────────────────────────────

async function runTestMode() {
  console.log('\n=== TEST MODE — 20 bills (10 House, 10 Senate, 2 HCR) ===\n')

  const { data: testBills, error } = await supabase
    .from('Bills')
    .select('id, bill_number, bill_type, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
    .in('bill_number', [
      'HB25', 'HB35', 'HB91', 'HB192', 'HB215', 'HB238', 'HB248', 'HB251', 'HB259', 'HB262',
      'SB5',  'SB16', 'SB22', 'SB32',  'SB62',  'SB94',  'SB105',
      'HCR1', 'HCR2',
    ])

  if (error) { console.error('Query error:', error.message); process.exit(1) }
  if (!testBills || testBills.length === 0) {
    const { data: fallback } = await supabase.from('Bills')
      .select('id, bill_number, bill_type, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
      .limit(20)
    if (!fallback || fallback.length === 0) { console.log('No bills in database'); process.exit(0) }
    testBills?.push(...(fallback ?? []))
  }

  console.log(`Selected ${testBills!.length} test bills: ${testBills!.map(b => b.bill_number).join(', ')}\n`)

  const results: Array<{
    bill_number:        string
    quality:            string
    formattingDetected: boolean
    rsCitations:        number
    abstractLen:        number
    digestLen:          number
    notes:              string[]
  }> = []

  let fetched = 0
  for (const bill of testBills!) {
    if (fetched >= MAX_PER_HOUR) { console.log('\nHourly rate limit reached — stopping test'); break }
    const result = await processBill(bill)
    if (result.quality !== 'skipped') fetched++
    results.push({ bill_number: bill.bill_number, ...result })
    await sleep(FETCH_DELAY_MS)
  }

  // ── Test report ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70))
  console.log('TEST EXTRACTION REPORT')
  console.log('='.repeat(70))

  const qualityDist: Record<string, number> = {}
  for (const r of results) {
    if (r.quality !== 'skipped') qualityDist[r.quality] = (qualityDist[r.quality] ?? 0) + 1
  }
  console.log('\nQuality Distribution:')
  for (const [q, count] of Object.entries(qualityDist)) {
    console.log(`  ${q.padEnd(14)}: ${count}`)
  }

  const processed     = results.filter(r => r.quality !== 'skipped')
  const fmtDetected   = results.filter(r => r.formattingDetected).length
  const withAbstract  = results.filter(r => r.abstractLen > 0).length
  const withDigest    = results.filter(r => r.digestLen > 0).length
  console.log(`\nFormatting detected (strikethrough/underline): ${fmtDetected}/${processed.length}`)
  console.log(`Abstract extracted: ${withAbstract}/${results.length}`)
  console.log(`Digest extracted:   ${withDigest}/${results.length}`)

  // Fetch fresh samples
  const { data: samples } = await supabase
    .from('Bills')
    .select('bill_number, extraction_quality, extraction_notes, abstract, digest, deleted_text, added_text, full_text')
    .in('bill_number', testBills!.map(b => b.bill_number))

  console.log('\n' + '-'.repeat(70))
  console.log('PER-BILL DETAILS:')
  console.log('-'.repeat(70))

  const sampleBills = (samples ?? []).filter(b => b.extraction_quality && b.extraction_quality !== 'failed').slice(0, 4)
  for (const s of sampleBills) {
    console.log(`\n${s.bill_number} [${s.extraction_quality}]`)
    if (s.extraction_notes) console.log(`  Notes: ${s.extraction_notes}`)
    if (s.abstract) {
      console.log(`  Abstract (${s.abstract.length} chars):`)
      console.log(`    ${s.abstract.substring(0, 300).replace(/\n/g, '\n    ')}...`)
    }
    if (s.digest) {
      console.log(`  Digest (${s.digest.length} chars):`)
      console.log(`    ${s.digest.substring(0, 300).replace(/\n/g, '\n    ')}...`)
    }
    if (s.deleted_text) console.log(`  Deleted text sample: ${s.deleted_text.substring(0, 150)}...`)
    if (s.added_text)   console.log(`  Added text sample:   ${s.added_text.substring(0, 150)}...`)
    const hasSection  = s.full_text?.includes('§') || s.abstract?.includes('§')
    const hasAccented = /[éèêëàâôùûüç]/i.test(s.full_text ?? '')
    console.log(`  § symbols present: ${hasSection ?? false} | Accented chars present: ${hasAccented}`)
  }

  const failed = results.filter(r => r.quality === 'failed')
  if (failed.length > 0) {
    console.log('\nFailed bills:')
    for (const f of failed) console.log(`  ${f.bill_number}: ${f.notes.join('; ')}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('⚠  PAUSED — Review results above before proceeding to full extraction.')
  console.log('   If extraction quality is acceptable, run: npx tsx scripts/extract-bill-text.ts')
  console.log('='.repeat(70))
}

// ── Production mode ───────────────────────────────────────────────────────────

async function runProductionMode(limit: number, priorityOnly: boolean, retryFailed: boolean, includeNew: boolean) {
  const modeLabel = retryFailed  ? 'retry-failed (all priorities)'
    : includeNew   ? 'new-only (extraction_quality=null)'
    : priorityOnly ? 'high+new'
    : 'high+normal+new'
  console.log(`\nProduction mode — limit=${limit}, mode=${modeLabel}\n`)

  let query = supabase
    .from('Bills')
    .select('id, bill_number, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
    .limit(limit)

  if (retryFailed) {
    // Re-attempt all bills that previously failed extraction, regardless of priority
    query = query.eq('extraction_quality', 'failed').order('id', { ascending: true })
  } else if (includeNew) {
    // One-time cleanup: only bills never extracted yet
    query = query.is('extraction_quality', null).order('id', { ascending: true })
  } else if (priorityOnly) {
    // High-priority mode: recently active bills + any bill never extracted (new this session)
    query = query.or('sync_priority.eq.high,extraction_quality.is.null').order('id', { ascending: true })
  } else {
    // Default: non-low priority + any bill never extracted (catches all new pre-filed bills)
    query = query.or('sync_priority.neq.low,extraction_quality.is.null').order('id', { ascending: true })
  }

  const { data: bills, error } = await query
  if (error) { console.error('Query error:', error.message); process.exit(1) }
  if (!bills || bills.length === 0) { console.log('No bills to process'); return }

  console.log(`Processing ${bills.length} bills...\n`)

  const stats = { processed: 0, failed: 0, skipped: 0, full: 0, partial: 0, digestOnly: 0, abstractOnly: 0 }
  let fetchedThisHour = 0
  const hourStart     = Date.now()

  for (const bill of bills) {
    if (fetchedThisHour >= MAX_PER_HOUR) {
      const elapsed   = Date.now() - hourStart
      const remaining = 3_600_000 - elapsed
      if (remaining > 0) {
        console.log(`\nRate limit (${MAX_PER_HOUR}/hour) reached — waiting ${Math.ceil(remaining / 60_000)} min`)
        await sleep(remaining)
        fetchedThisHour = 0
      }
    }

    let result: Awaited<ReturnType<typeof processBill>>
    try {
      result = await processBill(bill)
    } catch (e: any) {
      console.error(`  ✗ ${bill.bill_number}: unhandled error — ${e.message}`)
      stats.failed++; stats.processed++; fetchedThisHour++
      await sleep(FETCH_DELAY_MS)
      continue
    }
    if (result.quality === 'skipped') { stats.skipped++; continue }
    fetchedThisHour++
    stats.processed++
    if      (result.quality === 'failed')        stats.failed++
    else if (result.quality === 'full')          stats.full++
    else if (result.quality === 'partial')       stats.partial++
    else if (result.quality === 'digest_only')   stats.digestOnly++
    else if (result.quality === 'abstract_only') stats.abstractOnly++

    await sleep(FETCH_DELAY_MS)
  }

  console.log('\n=== Extraction Complete ===')
  console.log(`  Processed:     ${stats.processed}`)
  console.log(`  Skipped:       ${stats.skipped} (unchanged PDF)`)
  console.log(`  Full:          ${stats.full}`)
  console.log(`  Partial:       ${stats.partial}`)
  console.log(`  Digest only:   ${stats.digestOnly}`)
  console.log(`  Abstract only: ${stats.abstractOnly}`)
  console.log(`  Failed:        ${stats.failed}`)
}

// ── Entry point ────────────────────────────────────────────────────────────────

const isTest         = process.argv.includes('--test')
const isPriorityOnly = process.argv.includes('--high-priority')
const isRetryFailed  = process.argv.includes('--retry-failed')
const isIncludeNew   = process.argv.includes('--include-new')
const isBulk         = process.argv.includes('--bulk')
const limitArg       = process.argv.find(a => a.startsWith('--limit='))
const limit          = limitArg ? parseInt(limitArg.split('=')[1]) : 500

// Bulk mode: faster delays for one-time backfill runs
if (isBulk) {
  FETCH_DELAY_MS = 500
  MAX_PER_HOUR   = 999  // effectively unlimited — respect legis.la.gov via delay only
}

console.log('=== SessionSource — PDF Extraction Pipeline ===')
console.log(`Timestamp: ${new Date().toISOString()}`)
if (isBulk)        console.log('Mode: BULK (500ms delay, no hourly cap)')
if (isRetryFailed) console.log('Mode: RETRY-FAILED (all priorities, extraction_quality=failed only)')
if (isIncludeNew)  console.log('Mode: INCLUDE-NEW (extraction_quality=null only)')

if (isTest) {
  runTestMode().catch(e => { console.error('Fatal:', e); process.exit(1) })
} else {
  runProductionMode(limit, isPriorityOnly, isRetryFailed, isIncludeNew).catch(e => { console.error('Fatal:', e); process.exit(1) })
}
