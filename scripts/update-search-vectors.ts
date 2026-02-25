// scripts/update-search-vectors.ts
// Refreshes search_vector for all bills that have extracted text or metadata.
// Run after extract-bill-text.ts completes.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('Updating search vectors...')

  // Supabase JS client doesn't support raw SQL UPDATE with functions,
  // so we call the RPC or use the REST API directly.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL! + '/rest/v1/rpc/update_search_vectors_bulk'

  // Instead, fetch IDs of bills that need updating and batch-update via the trigger
  // by doing a no-op update that fires the trigger.
  const { data: bills, error: fetchErr } = await sb
    .from('Bills')
    .select('id')
    .or('extraction_quality.in.(full,partial),abstract.not.is.null,digest.not.is.null')
    .limit(2000)

  if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1) }

  const ids = (bills || []).map(b => b.id)
  console.log(`Found ${ids.length} bills to re-index`)

  let updated = 0
  const BATCH = 50

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    // Touch updated_at to fire the search_vector trigger
    const { error } = await sb
      .from('Bills')
      .update({ updated_at: new Date().toISOString() })
      .in('id', batch)

    if (error) {
      console.error(`Batch ${i}-${i+BATCH} error:`, error.message)
    } else {
      updated += batch.length
      process.stdout.write(`\r  Updated ${updated}/${ids.length}`)
    }
  }

  console.log(`\nDone. ${updated} search vectors refreshed.`)
}

main().catch(err => { console.error(err); process.exit(1) })
