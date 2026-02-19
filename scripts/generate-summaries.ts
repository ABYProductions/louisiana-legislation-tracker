// scripts/generate-summaries.ts
// Professional-grade legislative analysis using full bill text + digest

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!

async function fetchBillText(docId: number): Promise<string | null> {
  try {
    const url = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getBillText&id=${docId}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== 'OK' || !data.text?.doc) {
      console.log(`    No text available for doc_id ${docId}`)
      return null
    }
    const decoded = Buffer.from(data.text.doc, 'base64').toString('utf-8')
    return decoded
  } catch (err) {
    console.log(`    Error fetching bill text:`, err)
    return null
  }
}

async function generateSummary(bill: any, billText: string | null): Promise<string> {
  const textSection = billText
    ? `FULL BILL TEXT (including legislative digest):\n---\n${billText.substring(0, 14000)}\n---`
    : `NOTE: Full bill text not yet available from LegiScan. Analysis based on bill metadata only. Summary will be regenerated when text becomes available.`

  const prompt = `You are a senior Louisiana legislative attorney and policy analyst providing analysis for SessionSource, a public-facing Louisiana legislation tracking website. Your task is to produce professional-grade analysis of the following bill.

Your audience is dual: legal professionals and ordinary Louisiana citizens. Be precise enough for a professional, plain enough for the public.

LOUISIANA BILL FORMATTING CONVENTIONS:
- Text shown with STRIKETHROUGH indicates language being REMOVED from current law
- Text that is UNDERLINED or in ALL CAPS indicates language being ADDED as new law
- The DIGEST at the bottom of the bill is the legislature's own plain-English explanation of what "Present law" does and what "Proposed law" will do - use this as your primary interpretive source and cross-reference against the actual bill text

ANALYTICAL STANDARDS:
1. Identify the type of legislation: new law, amendment to existing law, repeal, constitutional amendment, or resolution
2. For amendments, precisely identify what language is being removed and what is being added
3. Identify every specific statutory citation - Louisiana Revised Statutes (R.S.), Civil Code articles, Code of Criminal Procedure articles, Code of Evidence articles, Constitution articles
4. Analyze with the depth of a specialist attorney in the relevant field
5. Understand the current state of the law and the gap or problem this bill addresses
6. Write in clear professional prose - no markdown symbols (no #, **, --, asterisks, or bullet points)
7. Use the three section headers EXACTLY as written below, each followed by a colon

BILL INFORMATION:
Bill Number: ${bill.bill_number}
Title: ${bill.title}
Description: ${bill.description || 'Not provided'}
Author: ${bill.author || 'Not specified'}
Status: ${bill.status || 'Pre-filed'}
Subjects: ${bill.subjects ? (Array.isArray(bill.subjects) ? bill.subjects.map((s: any) => s.subject_name || s).join(', ') : bill.subjects) : 'Not specified'}

${textSection}

Produce your analysis using EXACTLY these three section headers:

Bill Overview: In 3-4 sentences of clear, accessible prose, explain what this bill does. State whether it creates new law, amends existing law, repeals existing law, or proposes a constitutional amendment. Identify the core legal mechanism and what practical purpose it serves. A Louisiana citizen with no legal background should fully understand the bill's purpose after reading this section.

Potential Impact: Provide substantive analytical depth in 4-6 sentences. Identify every category of person, business, government agency, or institution affected and explain specifically how each is impacted. Address both intended effects and significant unintended consequences or implementation challenges. Consider how this bill interacts with existing Louisiana law. If this involves a constitutional amendment, address the electoral and procedural requirements. Explain the real-world consequences of passage versus failure.

Affected Legislation: Identify every specific statute, code article, or constitutional provision this bill touches. For each, provide the complete citation (e.g., La. R.S. 14:95.1, Civil Code Art. 2315, La. Const. Art. I Sec. 18, C.Cr.P. Art. 334) and a precise one-sentence explanation of exactly what is being changed, added, or repealed. If the bill creates entirely new law, identify where in the statutory scheme the new provisions fit and what legal gap they fill. Be exhaustive.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = message.content[0]
  if (content.type === 'text') return content.text
  return 'Summary could not be generated.'
}

async function processAllBills() {
  console.log('Starting professional summary generation...')
  console.log('Timestamp:', new Date().toISOString())
  console.log('---')

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .is('summary', null)
    .order('bill_number', { ascending: true })

  if (error) { console.error('Error fetching bills:', error); return }
  if (!bills || bills.length === 0) { console.log('No bills need summaries. All up to date!'); return }

  console.log(`Found ${bills.length} bills needing summaries`)
  console.log('---')

  let successCount = 0
  let errorCount = 0
  let textFetchCount = 0

  for (const bill of bills) {
    try {
      console.log(`Processing ${bill.bill_number}...`)

      let billText: string | null = null
      const texts = bill.texts as any[]

      if (texts && texts.length > 0) {
        const docId = texts[0].doc_id
        if (docId) {
          console.log(`  Fetching full text (doc_id: ${docId})...`)
          billText = await fetchBillText(docId)
          if (billText) {
            textFetchCount++
            console.log(`  Full text retrieved (${billText.length} chars)`)
          }
          await sleep(600)
        }
      }

      console.log(`  Generating professional analysis...`)
      const summary = await generateSummary(bill, billText)

      const updateData: any = { summary, updated_at: new Date().toISOString() }
      if (billText) updateData.full_text = billText.substring(0, 50000)

      const { error: updateError } = await supabase
        .from('Bills')
        .update(updateData)
        .eq('id', bill.id)

      if (updateError) {
        console.error(`  Error saving ${bill.bill_number}:`, updateError.message)
        errorCount++
      } else {
        console.log(`  Saved successfully`)
        successCount++
      }

      await sleep(2000)

    } catch (err) {
      console.error(`  Error processing ${bill.bill_number}:`, err)
      errorCount++
    }
  }

  console.log('---')
  console.log('Summary generation complete!')
  console.log(`  Successful: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Bills with full text: ${textFetchCount}`)
  console.log(`  Total processed: ${bills.length}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

processAllBills()
