import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import NEWS_SOURCES from '@/lib/news-sources'

export const revalidate = 1800

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('news_articles')
    .select('source_id, source_name, published_at')
    .gte('published_at', sevenDaysAgo)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate client-side
  const counts: Record<string, { source_name: string; count: number; latest: string }> = {}
  for (const row of (data || [])) {
    if (!counts[row.source_id]) {
      counts[row.source_id] = { source_name: row.source_name, count: 0, latest: row.published_at }
    }
    counts[row.source_id].count++
    if (row.published_at > counts[row.source_id].latest) {
      counts[row.source_id].latest = row.published_at
    }
  }

  // Merge with source metadata
  const sources = Object.entries(counts)
    .map(([source_id, info]) => {
      const meta = NEWS_SOURCES.find(s => s.id === source_id)
      return {
        source_id,
        source_name: info.source_name,
        article_count: info.count,
        latest_article: info.latest,
        logo_initial: meta?.logo_initial || source_id.slice(0, 2).toUpperCase(),
        accent_color: meta?.accent_color || '#666',
      }
    })
    .sort((a, b) => b.article_count - a.article_count)

  return NextResponse.json({ sources, total_sources: sources.length })
}
