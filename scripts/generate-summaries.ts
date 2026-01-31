import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function generateSummary(bill: any): Promise<string> {
  const prompt = `You are a legislative analyst providing summaries for a public-facing Louisiana legislation tracking website. Write in clear, professional prose without any markdown formatting symbols (no #, ##, **, or bullet points with -). Use natural paragraphs and sentences.

Structure your summary with these sections, using the section names as simple headers followed by a colon:

Executive Summary: Write 2-3 sentences providing a concise overview of what this bill does and why it matters.

Existing Statutes Impacted: List the specific Louisiana statutes this bill amends, creates, or repeals. For each statute, provide the citation (e.g., La. R.S. 17:252) and a brief explanation of how it is being changed. If no specific statutes are cited in the bill text, note that this bill creates new provisions.

Affected Parties: Identify all individuals, organizations, government agencies, or groups who would be directly or indirectly affected by this legislation. Explain how each party is affected.

Impact Potential: Provide an intelligent analysis of the potential implications of this bill. Consider how this changes existing law, what problems it tries to solve, the likely practical effects if enacted, and how this fits into the broader legal or policy landscape.

Write as if you are a knowledgeable attorney or policy analyst explaining this bill to an intelligent layperson. Be comprehensive but accessible. Never use markdown symbols.

Bill Number: ${bill.bill_number}
Title: ${bill.title}
Description: ${bill.description || "Not provided"}
Author: ${bill.author || "Not specified"}
Status: ${bill.status || "Not specified"}
Subjects: ${bill.subjects ? bill.subjects.map((s: any) => s.subject_name).join(", ") : "Not specified"}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }
  return 'Summary could not be generated.'
}

async function processAllBills() {
  console.log('Starting summary generation...')
  console.log('Timestamp:', new Date().toISOString())
  console.log('---')

  // Fetch bills without summaries
  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .is('summary', null)
    .order('bill_number', { ascending: true })

  if (error) {
    console.error('Error fetching bills:', error)
    return
  }

  if (!bills || bills.length === 0) {
    console.log('No bills need summaries. All bills are up to date!')
    return
  }

  console.log(`Found ${bills.length} bills needing summaries`)
  console.log('---')

  let successCount = 0
  let errorCount = 0

  for (const bill of bills) {
    try {
      console.log(`Generating summary for ${bill.bill_number}...`)
      
      const summary = await generateSummary(bill)
      
      // Update the bill with the summary
      const { error: updateError } = await supabase
        .from('Bills')
        .update({ summary: summary, updated_at: new Date().toISOString() })
        .eq('id', bill.id)

      if (updateError) {
        console.error(`  ✗ Error saving summary for ${bill.bill_number}:`, updateError.message)
        errorCount++
      } else {
        console.log(`  ✓ Summary saved for ${bill.bill_number}`)
        successCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (err) {
      console.error(`  ✗ Error generating summary for ${bill.bill_number}:`, err)
      errorCount++
    }
  }

  console.log('---')
  console.log('Summary generation complete!')
  console.log(`  Successful: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Total processed: ${bills.length}`)
}

processAllBills()
