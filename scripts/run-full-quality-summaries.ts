// scripts/run-full-quality-summaries.ts
// =============================================================================
// One-off runner: generate summaries for bills with extraction_quality='full'
// and summary_status='pending'.
//
// Uses a hardened prompt:
//   - Plain prose only — no markdown, no asterisks, no headers, no bullets
//   - Never reference source material quality
//   - Never begin with "I"
//   - Return INSUFFICIENT_DATA sentinel if unable to write substantive analysis
// =============================================================================

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function sanitize(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim()
}

// ─── Hardened quality gate ─────────────────────────────────────────────────

const BANNED = [
  'INSUFFICIENT_DATA',
  'I apologize', 'I cannot', "I don't have", 'I must note',
  'metadata', 'limited information', 'full text of the bill',
  'does not contain', 'provided document', 'unable to access',
  'only metadata', 'text is not available', 'no text available',
  'based on available', 'based on the available',
  'based on the information provided', 'as an ai',
  'corrupted', 'SessionSource is preparing', 'full legislative text',
]

function isGoodSummary(text: string | null): boolean {
  if (!text || text.trim().length < 200) return false
  const lower = text.toLowerCase()
  return !BANNED.some(p => lower.includes(p.toLowerCase()))
}

// ─── Hardened system prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior legislative counsel and legal analyst for SessionSource, a Louisiana legislation tracking platform. Your task is to produce a rigorous, professional legal analysis of each Louisiana bill — the kind of analysis a seasoned Louisiana attorney would prepare for a client briefing.

LOUISIANA LEGAL TRADITION: Louisiana follows the civil law tradition derived from the Napoleonic Code, not the common law tradition of other states. Louisiana courts interpret statutes primarily by their text and the legislature's manifest intent, not by common law precedent. When analyzing bills, note where Louisiana's civil law framework creates different implications than a common law analysis would suggest.

CITATION IDENTIFICATION: Explicitly identify every R.S. (Louisiana Revised Statutes), C.C. (Civil Code), C.C.P. (Code of Civil Procedure), C.Cr.P. (Code of Criminal Procedure), and Constitutional citation in the bill. For each cited statute, briefly describe what the current provision provides before explaining how the bill modifies it.

AMENDMENT ANALYSIS: When the bill text includes [DELETED: ...] markers, analyze what the deleted language currently provides under Louisiana law and explain the legal significance of its removal. When it includes [ADDED: ...] markers, analyze the legal effect of the new language being inserted.

For each bill, your analysis must cover:

STATUTORY CONTEXT — Identify every specific statute, code article, or constitutional provision being amended, enacted, or repealed. State the Title, Chapter, Part, and Section numbers explicitly. Describe what current law provides before this bill's changes.

SCOPE AND NATURE OF THE CHANGE — Analyze the precise language changes being made. Distinguish between substantive changes to legal rights, duties, or remedies; procedural changes; definitional changes; and structural reorganizations. If [DELETED] and [ADDED] markers are present, analyze each explicitly.

PURPOSE AND LEGISLATIVE INTENT — Based on the bill text and digest, identify the apparent legislative purpose. What problem or gap in existing law is this bill designed to address?

PRACTICAL IMPACT AND AFFECTED PARTIES — Identify specifically who is affected: which individuals, professions, industries, government entities, or classes of persons will experience changed legal rights, obligations, or exposure. Note any potential constitutional implications or conflicts with federal law if apparent from the text.

CURRENT STATUS — State the bill's current procedural posture based on available information.

FORMATTING RULES — STRICTLY ENFORCED:
- Write in plain prose paragraphs only. Use section labels as plain text headings followed by a colon, then continue in prose.
- Do not use markdown syntax of any kind — no asterisks, no pound signs, no hyphens as bullets, no underscores, no backticks.
- Do not use bullet points or numbered lists anywhere in the analysis.
- Do not begin any sentence with the word "I".
- Do not reference the quality, completeness, or source of the bill text provided to you in any way.
- Do not use phrases like "based on the provided text", "the document indicates", or similar.
- If the bill text is sufficient to perform a substantive legal analysis, perform it completely and professionally.
- If the bill text is too sparse to support any substantive legal analysis at all, respond with exactly the text: INSUFFICIENT_DATA`

// ─── Generate one summary ──────────────────────────────────────────────────

async function generateSummary(bill: any): Promise<string> {
  const subjects = Array.isArray(bill.subjects)
    ? bill.subjects.map((s: any) => s.subject_name || s).filter(Boolean).join(', ')
    : 'Not specified'

  let userMessage = `Please analyze this Louisiana bill:\n\n`
  userMessage += `Bill Number: ${bill.bill_number}\n`
  userMessage += `Title: ${bill.title ?? 'Not provided'}\n`
  userMessage += `Author: ${bill.author ?? 'Not specified'}\n`
  userMessage += `Status: ${bill.status ?? 'Pre-filed'}\n`
  userMessage += `Subjects: ${subjects}\n\n`

  if (bill.abstract) {
    userMessage += `ENACTING CLAUSE:\n---\n${bill.abstract}\n---\n\n`
  }
  if (bill.digest) {
    userMessage += `LOUISIANA LEGISLATIVE BUREAU DIGEST (prepared by professional Louisiana legislative attorneys — your analysis must be consistent with this digest's interpretation of the bill's effect):\n---\n${bill.digest.substring(0, 6000)}\n---\n\n`
  }
  if (bill.deleted_text && bill.deleted_text.length > 10) {
    userMessage += `TEXT BEING DELETED FROM EXISTING LAW:\n---\n${bill.deleted_text.substring(0, 3000)}\n---\n\n`
  }
  if (bill.added_text && bill.added_text.length > 10) {
    userMessage += `TEXT BEING ADDED TO EXISTING LAW:\n---\n${bill.added_text.substring(0, 3000)}\n---\n\n`
  }
  if (bill.full_text && bill.full_text.length > 100) {
    userMessage += `FULL BILL TEXT:\n---\n${bill.full_text.substring(0, 12000)}\n---`
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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Full-quality pending bill summary generation ===')
  console.log('Timestamp:', new Date().toISOString())

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .eq('extraction_quality', 'full')
    .neq('summary_status', 'complete')
    .order('bill_number', { ascending: true })

  if (error) {
    console.error('Supabase fetch error:', error)
    process.exit(1)
  }

  console.log(`Found ${bills?.length ?? 0} bills with extraction_quality=full and summary_status!=complete\n`)

  if (!bills || bills.length === 0) {
    console.log('Nothing to do.')
    process.exit(0)
  }

  let upgraded   = 0
  let failed     = 0
  let gateReject = 0

  for (const bill of bills) {
    process.stdout.write(`  ${bill.bill_number.padEnd(8)}`)

    let summary: string
    try {
      summary = await generateSummary(bill)
    } catch (err: any) {
      console.log(` ERROR: ${err.message}`)
      failed++
      await sleep(3000)
      continue
    }

    if (!isGoodSummary(summary)) {
      console.log(` REJECTED (quality gate)`)
      gateReject++
      await sleep(2000)
      continue
    }

    const { error: updateErr } = await supabase
      .from('Bills')
      .update({
        summary,
        summary_status:     'complete',
        summary_updated_at: new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      })
      .eq('id', bill.id)

    if (updateErr) {
      console.log(` DB ERROR: ${updateErr.message}`)
      failed++
    } else {
      console.log(` ✓`)
      upgraded++
    }

    await sleep(2000)
  }

  console.log('\n=== Complete ===')
  console.log(`  Summaries written : ${upgraded}`)
  console.log(`  Quality rejected  : ${gateReject}`)
  console.log(`  Errors            : ${failed}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
