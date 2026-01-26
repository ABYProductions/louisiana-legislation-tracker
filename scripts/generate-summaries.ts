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
  const prompt = `You are an expert at explaining legislation in plain language. Analyze the following Louisiana bill and provide a clear, concise summary.

Bill Number: ${bill.bill_number}
Title: ${bill.title}
Description: ${bill.description || 'Not provided'}
Author: ${bill.author || 'Not specified'}
Status: ${bill.status || 'Not specified'}
Subjects: ${bill.subjects ? bill.subjects.map((s: any) => s.subject_name).join(', ') : 'Not specified'}

Please provide:
1. A 2-3 sentence plain-language summary of what this bill does
2. Who would be affected by this bill
3. The potential impact if passed

Keep your response under 200 words and avoid legal jargon. Write for an educated general audience.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
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
