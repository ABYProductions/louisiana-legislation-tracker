import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const revalidate = 900

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const industry = searchParams.get('industry')
  const source = searchParams.get('source')
  const breakingOnly = searchParams.get('breaking_only') === 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check for auth session for personalization
  let userIndustryPrefs: string[] = []
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      const { data: prefs } = await authClient
        .from('user_preferences')
        .select('news_industry_preferences')
        .eq('user_id', user.id)
        .single()
      userIndustryPrefs = prefs?.news_industry_preferences || []
    }
  } catch {
    // No auth or prefs — continue without personalization
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('news_articles')
    .select('*', { count: 'exact' })
    .gte('published_at', sevenDaysAgo)
    .gte('relevance_score', 3)

  if (breakingOnly) query = query.eq('is_breaking', true)
  if (industry) query = query.contains('industry_tags', [industry])
  if (source) query = query.eq('source_id', source)

  // Count breaking articles
  const { count: breakingCount } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true })
    .gte('published_at', sevenDaysAgo)
    .eq('is_breaking', true)

  const personalized = userIndustryPrefs.length > 0

  // Personalized sort: user's industries bubble up
  if (personalized) {
    // Fetch a larger window and sort in JS
    const { data: allArticles, error, count } = await query
      .order('published_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = allArticles || []
    const breaking = rows.filter(a => a.is_breaking)
    const matching = rows.filter(a =>
      !a.is_breaking &&
      a.industry_tags?.some((t: string) => userIndustryPrefs.includes(t))
    ).sort((a: any, b: any) => b.relevance_score - a.relevance_score || b.published_at.localeCompare(a.published_at))
    const rest = rows.filter(a =>
      !a.is_breaking &&
      !a.industry_tags?.some((t: string) => userIndustryPrefs.includes(t))
    ).sort((a: any, b: any) => b.relevance_score - a.relevance_score || b.published_at.localeCompare(a.published_at))

    const sorted = [...breaking, ...matching, ...rest]
    const page = sorted.slice(offset, offset + limit)

    return NextResponse.json({
      articles: page,
      total: count || rows.length,
      has_more: offset + limit < (count || rows.length),
      last_updated: new Date().toISOString(),
      breaking_count: breakingCount || 0,
      personalized: true,
    })
  }

  const { data, error, count } = await query
    .order('is_breaking', { ascending: false })
    .order('relevance_score', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    articles: data || [],
    total: count || 0,
    has_more: (count || 0) > offset + limit,
    last_updated: new Date().toISOString(),
    breaking_count: breakingCount || 0,
    personalized: false,
  })
}
