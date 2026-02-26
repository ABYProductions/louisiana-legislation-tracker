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
// ─── Quality gate ─────────────────────────────────────────────────────────────

const BANNED_PHRASES = [
  'INSUFFICIENT_DATA',
  'I apologize',
  'corrupted',
  'I must note',
  '**',
  '## ',
  '# ',
  '2025 Regular Session',
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
  'appears to be',
  'seems to be',
  'without the full',
  'without the',
  'bill text',
  'improperly formatted',
  'cannot be determined',
  'it is unclear',
  'it is not clear',
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

// ─── System prompt ────────────────────────────────────────────────────────────
// Instructs the AI on Louisiana-specific legal context, amendment analysis,
// and how to use the structured elements (abstract, digest, deleted/added text).

const SYSTEM_PROMPT = `You are a senior legislative analyst writing professional bill summaries for attorneys, lobbyists, and government officials in Louisiana.

Write three paragraphs in plain prose:
Paragraph 1: What the bill does — the specific legal changes it makes, what statutes it amends or creates, and the core mechanism of the legislation.
Paragraph 2: Who is affected and how — the practical impact on specific groups of people, agencies, businesses, or local governments.
Paragraph 3: The statutory context — what existing law this interacts with, what legal framework it operates within, and any constitutional considerations if relevant.

ABSOLUTE OUTPUT RULES — any violation causes automatic rejection:
- Plain prose paragraphs only
- Zero markdown syntax
- Zero asterisks or bold
- Zero headers
- Zero bullet points or numbered lists
- Never begin any sentence with the word I
- Never mention the quality, format, availability, or completeness of source material
- Never use these phrases: appears to, seems to, without the full, without the, based on available, I must note, full text, bill text, corrupted, improperly formatted, PDF, cannot be determined, it is unclear, it is not clear
- If you cannot write three substantive paragraphs from the provided source material, return exactly and only: INSUFFICIENT_DATA`

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
    model:      'claude-haiku-4-5-20251001',
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
    .in('extraction_quality', ['full', 'partial'])
    .neq('summary_status', 'complete')
    .order('extraction_quality', { ascending: true })   // 'full' before 'partial'
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

    // ── Tier 1-2: Full or partial PDF extraction with full text ──────────────
    if ((quality === 'full' || quality === 'partial') && bill.full_text) {
      log(`  Source: PDF text (${quality}) — generating AI analysis`)
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
        log(`  ${bill.bill_number} ERROR: ${err.message}`)
        stillPending++
        await sleep(2000)
        continue
      }

      if (!isGoodSummary(summary)) {
        log(`  ${bill.bill_number} REJECTED (quality gate)`)
        stillPending++
        await sleep(2000)
        continue
      }

      await supabase.from('Bills').update({
        summary,
        summary_status:     'complete',
        summary_updated_at: new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', bill.id)
      log(`  ✓ ${bill.bill_number} — AI analysis complete`)
      upgraded++
      await sleep(2000)
      continue
    }

    // ── Tier 3: Partial extraction with no full text — use digest/abstract ────
    if (quality === 'partial' && !bill.full_text && (bill.digest || bill.abstract)) {
      log(`  Source: partial (no full text) — using digest/abstract`)
      bySource['partial_digest'] = (bySource['partial_digest'] ?? 0) + 1

      let summary: string
      try {
        summary = await generateSummary(bill, {
          abstract:    bill.abstract,
          digest:      bill.digest,
          bodyText:    null,
          deletedText: bill.deleted_text,
          addedText:   bill.added_text,
          source:      'partial_digest',
        })
      } catch (err: any) {
        log(`  ${bill.bill_number} ERROR: ${err.message}`)
        stillPending++
        await sleep(2000)
        continue
      }

      if (!isGoodSummary(summary)) {
        log(`  ${bill.bill_number} REJECTED (quality gate)`)
        stillPending++
        await sleep(2000)
        continue
      }

      await supabase.from('Bills').update({
        summary,
        summary_status:     'complete',
        summary_updated_at: new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', bill.id)
      log(`  ✓ ${bill.bill_number} — partial digest analysis complete`)
      upgraded++
      await sleep(2000)
      continue
    }

    // ── No usable source for this bill ────────────────────────────────────────
    log(`  ${bill.bill_number} SKIPPED — no usable text source (${quality ?? 'null'})`)
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
