import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllFeeds } from '@/lib/rss-fetcher'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { articles, sources_succeeded, sources_failed, total_fetched } =
    await fetchAllFeeds()

  if (articles.length === 0) {
    return NextResponse.json({ message: 'No articles fetched', sources_succeeded, sources_failed })
  }

  const BATCH = 50
  let inserted = 0

  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH)
    await supabase.from('news_articles').upsert(
      batch.map(a => ({
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
      })),
      { onConflict: 'url', ignoreDuplicates: false }
    )
    inserted += batch.length
  }

  // Prune old articles
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('news_articles').delete().lt('published_at', cutoff)

  return NextResponse.json({
    success: true,
    total_fetched,
    inserted,
    sources_succeeded,
    sources_failed,
    timestamp: new Date().toISOString(),
  })
}
