import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data, error } = await sb
    .from('Bills')
    .select('extraction_quality, summary_status, summary')
    .limit(2000)

  if (error) { console.error(error); process.exit(1) }

  const rows = data || []
  const total = rows.length
  const full = rows.filter(r => r.extraction_quality === 'full').length
  const partial = rows.filter(r => r.extraction_quality === 'partial').length
  const failed = rows.filter(r => r.extraction_quality === 'failed').length
  const neverExtracted = rows.filter(r => r.extraction_quality == null).length
  const hasCleanSummary = rows.filter(r => r.summary_status === 'complete' && r.summary != null).length
  const needsSummary = rows.filter(r => r.summary_status === 'pending').length

  console.log('=== Current State Audit ===')
  console.log(`Date/Time:         ${new Date().toISOString()}`)
  console.log(`Total bills:       ${total}`)
  console.log(`full_extraction:   ${full}`)
  console.log(`partial:           ${partial}`)
  console.log(`failed:            ${failed}`)
  console.log(`never_extracted:   ${neverExtracted}`)
  console.log(`has_clean_summary: ${hasCleanSummary}  (${((hasCleanSummary/total)*100).toFixed(1)}%)`)
  console.log(`needs_summary:     ${needsSummary}`)
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'SET (' + process.env.ANTHROPIC_API_KEY.slice(0,8) + '...)' : 'NOT SET'}`)
  console.log(`SUPABASE_SRK:      ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`)
}

main().catch(err => { console.error(err); process.exit(1) })
