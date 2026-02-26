// scripts/sync-news.ts
// Fetches all RSS feeds, scores articles, and upserts into news_articles table.
// Run manually or via Vercel cron at /api/cron/sync-news every 15 minutes.

import { createClient } from '@supabase/supabase-js'
import { fetchAllFeeds } from '../lib/rss-fetcher'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('=== SessionSource News Sync ===')
  console.log('Started:', new Date().toISOString())

  // Log sync run start
  const { data: syncRun } = await supabase
    .from('news_sync_runs')
    .insert({ started_at: new Date().toISOString() })
    .select('id')
    .single()

  const syncRunId = syncRun?.id

  // Fetch all feeds
  console.log('\nFetching RSS feeds...')
  const { articles, sources_succeeded, sources_failed, total_fetched, source_results } =
    await fetchAllFeeds()

  console.log(`\nFeed results:`)
  for (const r of source_results) {
    const status = r.error ? `FAILED (${r.error})` : `${r.count} articles`
    console.log(`  ${r.id.padEnd(20)}: ${status}`)
  }

  console.log(`\nTotal articles passing relevance filter: ${total_fetched}`)
  console.log(`Sources succeeded: ${sources_succeeded}, failed: ${sources_failed}`)

  if (articles.length === 0) {
    console.log('No articles to insert.')
    if (syncRunId) {
      await supabase.from('news_sync_runs').update({
        completed_at: new Date().toISOString(),
        articles_fetched: 0,
        articles_inserted: 0,
        articles_skipped: 0,
        sources_succeeded,
        sources_failed,
      }).eq('id', syncRunId)
    }
    return
  }

  // Upsert articles in batches of 50
  let inserted = 0
  let skipped = 0
  const BATCH = 50
  const errorLog: any[] = []

  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH)
    const rows = batch.map(a => ({
      title:                a.title,
      description:          a.description,
      url:                  a.url,
      source_name:          a.source_name,
      source_id:            a.source_id,
      published_at:         a.published_at.toISOString(),
      fetched_at:           new Date().toISOString(),
      relevance_score:      a.relevance_score,
      industry_tags:        a.industry_tags,
      related_bill_numbers: a.related_bill_numbers,
      image_url:            a.image_url,
      is_breaking:          a.is_breaking,
    }))

    const { error, count } = await supabase
      .from('news_articles')
      .upsert(rows, {
        onConflict: 'url',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      console.error(`Batch ${i}-${i + BATCH} error:`, error.message)
      errorLog.push({ batch: i, error: error.message })
      skipped += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\r  Upserted ${inserted}/${articles.length}`)
    }
  }

  console.log(`\n\nUpsert complete: ${inserted} articles processed`)

  // Prune articles older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { count: deleted } = await supabase
    .from('news_articles')
    .delete({ count: 'exact' })
    .lt('published_at', cutoff)

  if (deleted) console.log(`Pruned ${deleted} articles older than 14 days`)

  // Show top 5 by relevance
  const top5 = articles.slice(0, 20).sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 5)
  console.log('\nTop 5 highest-scoring articles:')
  for (const a of top5) {
    console.log(`  [${a.relevance_score}] ${a.title.substring(0, 80)}`)
  }

  // Industry distribution
  const industryCount: Record<string, number> = {}
  for (const a of articles) {
    for (const tag of a.industry_tags) {
      industryCount[tag] = (industryCount[tag] || 0) + 1
    }
  }
  const industryTop = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (industryTop.length > 0) {
    console.log('\nTop industries covered:')
    for (const [ind, count] of industryTop) {
      console.log(`  ${ind.padEnd(30)}: ${count}`)
    }
  }

  // Update sync run log
  if (syncRunId) {
    await supabase.from('news_sync_runs').update({
      completed_at:      new Date().toISOString(),
      articles_fetched:  total_fetched,
      articles_inserted: inserted,
      articles_skipped:  skipped,
      sources_succeeded,
      sources_failed,
      error_log:         errorLog,
    }).eq('id', syncRunId)
  }

  console.log('\n=== Sync complete ===')
  console.log(`  ${total_fetched} articles fetched`)
  console.log(`  ${inserted} inserted/updated`)
  console.log(`  ${sources_succeeded} sources succeeded, ${sources_failed} failed`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
