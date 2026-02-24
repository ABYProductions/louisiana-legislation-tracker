// scripts/generate-summaries.ts
// Professional legislative analysis — LegiScan text + PDF fallback + quality gates

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: unknown) => Promise<{ text: string }>

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!

// ─── Quality gate ─────────────────────────────────────────────────────────────

const BAD_PHRASES = [
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
]

export function isGoodSummary(text: string | null): boolean {
  if (!text || text.length < 200) return false
  const lower = text.toLowerCase()
  return !BAD_PHRASES.some(p => lower.includes(p))
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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Text source 1: LegiScan API ──────────────────────────────────────────────

export async function fetchLegiScanText(
  bill: any
): Promise<{ text: string | null; source: string }> {
  const texts = bill.texts as any[] | null
  if (!texts || texts.length === 0) return { text: null, source: 'none' }

  const sorted = [...texts].reverse() // newest first
  for (const doc of sorted) {
    const docId = doc.doc_id
    if (!docId) continue
    try {
      const url = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getBillText&id=${docId}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (data.status !== 'OK' || !data.text?.doc) continue

      const decoded = Buffer.from(data.text.doc, 'base64').toString('utf-8')
      const cleaned = sanitize(decoded)
      if (cleaned.length >= 200) return { text: cleaned, source: 'legiscan' }
    } catch (_) {}
    await sleep(400)
  }
  return { text: null, source: 'none' }
}

// ─── Text source 2: PDF from legis.la.gov ─────────────────────────────────────

export async function fetchPdfText(
  bill: any
): Promise<{ text: string | null; source: string }> {
  try {
    const billNum = (bill.bill_number || '').replace(/\s+/g, '')
    if (!billNum) return { text: null, source: 'none' }

    const infoUrl = `https://legis.la.gov/legis/BillInfo.aspx?s=26RS&b=${billNum}&sbi=y`
    const htmlResp = await fetch(infoUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!htmlResp.ok) return { text: null, source: 'none' }

    const html = await htmlResp.text()

    const viewMatch = html.match(/ViewDocument\.aspx\?d=(\d+)/i)
    const pdfMatch = html.match(/href="([^"]*\.pdf[^"]*)"/i)
    const docLink = viewMatch
      ? `https://legis.la.gov/Legis/ViewDocument.aspx?d=${viewMatch[1]}`
      : pdfMatch
      ? pdfMatch[1].startsWith('http')
        ? pdfMatch[1]
        : `https://legis.la.gov${pdfMatch[1]}`
      : null

    if (!docLink) return { text: null, source: 'none' }

    const pdfResp = await fetch(docLink, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!pdfResp.ok) return { text: null, source: 'none' }

    const contentType = pdfResp.headers.get('content-type') || ''
    const buffer = Buffer.from(await pdfResp.arrayBuffer())

    let text: string
    if (contentType.includes('pdf') || docLink.toLowerCase().includes('.pdf')) {
      const parsed = await pdfParse(buffer)
      text = sanitize(parsed.text)
    } else {
      text = sanitize(buffer.toString('utf-8').replace(/<[^>]+>/g, ' '))
    }

    if (text.length >= 200) return { text, source: 'pdf' }
  } catch (_) {}

  return { text: null, source: 'none' }
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior legislative counsel and legal analyst for SessionSource, a Louisiana legislation tracking platform serving attorneys, policymakers, and informed citizens. Your task is to produce a rigorous, professional legal analysis of each Louisiana bill — the kind of analysis a seasoned Louisiana attorney would prepare for a client briefing.

For each bill, your analysis must:

STEP 1 — STATUTORY CONTEXT
Identify the specific Louisiana Revised Statutes, Louisiana Constitution articles, Louisiana Civil Code articles, or Louisiana Code of Criminal Procedure articles being amended, enacted, or repealed. State the Title, Chapter, Part, and Section numbers explicitly. Briefly describe what the current law provides before this bill's changes — give the reader the legal baseline so they understand what is being modified and why it matters.

STEP 2 — SCOPE AND NATURE OF THE CHANGE
Analyze the precise language changes being made. Distinguish between: (a) substantive changes to legal rights, duties, or remedies, (b) procedural changes to how law is administered or enforced, (c) definitional changes that expand or narrow the scope of existing law, and (d) structural reorganizations with no substantive effect. Identify which provisions are being added, deleted, or modified and what legal effect each change produces.

STEP 3 — PURPOSE AND LEGISLATIVE INTENT
Based on the bill text, identify the apparent legislative purpose. What problem or gap in existing law is this bill designed to address? Reference the relevant area of Louisiana law — tort law, contract law, criminal law, family law, administrative law, property law, etc. — and explain how this bill fits within or departs from existing legal doctrine and jurisprudence in that area.

STEP 4 — PRACTICAL IMPACT AND AFFECTED PARTIES
Identify specifically who is affected by this legislation: which individuals, professions, industries, government entities, or classes of persons will experience changed legal rights, obligations, or exposure as a result. Explain the practical real-world consequences of the change — what can now be done that could not before, or vice versa. Note any potential constitutional implications, conflicts with federal law, or tension with existing Louisiana jurisprudence if apparent from the text.

STEP 5 — CURRENT STATUS
State the bill's current procedural posture — committee referral, floor status, amendments adopted — based on available information.

Write in clear, precise legal prose suitable for a professional audience. Be direct and analytical. Do not pad the summary with generalities. Do not use bullet points — write in paragraphs. Never reference your data sources, never mention limitations of your access, never say you lack information, never use phrases like based on available metadata or the provided document. If the bill text is sufficient to perform this analysis, perform it completely and professionally.`

// ─── Summary generation ───────────────────────────────────────────────────────

export async function generateSummary(bill: any, billText: string): Promise<string> {
  const subjects =
    bill.subjects && Array.isArray(bill.subjects)
      ? bill.subjects.map((s: any) => s.subject_name || s).filter(Boolean).join(', ')
      : 'Not specified'

  const userMessage = `Please analyze this Louisiana bill:

Bill Number: ${bill.bill_number}
Title: ${bill.title || 'Not provided'}
Description: ${bill.description || 'Not provided'}
Author: ${bill.author || 'Not specified'}
Status: ${bill.status || 'Pre-filed'}
Subjects: ${subjects}

Full Bill Text:
---
${billText.substring(0, 15000)}
---`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  if (content.type === 'text') return sanitize(content.text)
  return ''
}

// ─── Process all pending bills ────────────────────────────────────────────────

export async function processPendingBills(verbose = true): Promise<{
  upgraded: number
  stillPending: number
  legiscanCount: number
  pdfCount: number
}> {
  const log = verbose ? console.log : () => {}

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .neq('summary_status', 'complete')
    .order('bill_number', { ascending: true })
    .limit(2000)

  if (error) {
    console.error('Error fetching pending bills:', error)
    return { upgraded: 0, stillPending: 0, legiscanCount: 0, pdfCount: 0 }
  }

  if (!bills || bills.length === 0) {
    log('No pending bills to process.')
    return { upgraded: 0, stillPending: 0, legiscanCount: 0, pdfCount: 0 }
  }

  log(`Found ${bills.length} pending bills`)

  let upgraded = 0
  let stillPending = 0
  let legiscanCount = 0
  let pdfCount = 0

  for (const bill of bills) {
    log(`\nProcessing ${bill.bill_number}...`)

    // Try LegiScan first
    let { text: billText, source: textSource } = await fetchLegiScanText(bill)

    if (!billText || billText.length < 200) {
      log(`  LegiScan: no text — trying PDF fallback`)
      const pdf = await fetchPdfText(bill)
      billText = pdf.text
      textSource = pdf.source
    }

    // No usable text at all
    if (!billText || billText.length < 200) {
      log(`  No text available — storing placeholder, status=pending`)
      await supabase
        .from('Bills')
        .update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' })
        .eq('id', bill.id)
      stillPending++
      continue
    }

    log(`  Text source: ${textSource} (${billText.length} chars)`)
    if (textSource === 'legiscan') legiscanCount++
    else if (textSource === 'pdf') pdfCount++

    // Generate summary
    log(`  Generating legal analysis...`)
    let summary: string
    try {
      summary = await generateSummary(bill, billText)
    } catch (err: any) {
      log(`  Anthropic error: ${err.message}`)
      stillPending++
      await sleep(2000)
      continue
    }

    // Quality gate
    if (!isGoodSummary(summary)) {
      log(`  Quality check FAILED — discarding, status=pending`)
      await supabase
        .from('Bills')
        .update({ summary: PENDING_PLACEHOLDER, summary_status: 'pending' })
        .eq('id', bill.id)
      stillPending++
      await sleep(2000)
      continue
    }

    log(`  Quality check passed — saving`)

    const updateData: any = {
      summary,
      summary_status: 'complete',
      updated_at: new Date().toISOString(),
    }
    if (billText) updateData.full_text = billText.substring(0, 50000)

    const { error: saveErr } = await supabase
      .from('Bills')
      .update(updateData)
      .eq('id', bill.id)

    if (saveErr) {
      log(`  Save error: ${saveErr.message}`)
      stillPending++
    } else {
      log(`  ✓ ${bill.bill_number} saved`)
      upgraded++
    }

    await sleep(2000)
  }

  return { upgraded, stillPending, legiscanCount, pdfCount }
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
    .then(({ upgraded, stillPending, legiscanCount, pdfCount }) => {
      console.log('\n=== Generation Complete ===')
      console.log(`  Upgraded to complete:  ${upgraded}`)
      console.log(`  Still pending:         ${stillPending}`)
      console.log(`  Text from LegiScan:    ${legiscanCount}`)
      console.log(`  Text from PDF:         ${pdfCount}`)
      process.exit(0)
    })
    .catch(err => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
