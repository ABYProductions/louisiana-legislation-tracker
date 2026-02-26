import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function GET() {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('news_industry_preferences, news_enabled, news_show_breaking_only')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    news_industry_preferences: data?.news_industry_preferences || [],
    news_enabled: data?.news_enabled ?? true,
    news_show_breaking_only: data?.news_show_breaking_only ?? false,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, any> = { user_id: user.id, updated_at: new Date().toISOString() }

  if (Array.isArray(body.news_industry_preferences)) {
    updates.news_industry_preferences = body.news_industry_preferences
  }
  if (typeof body.news_enabled === 'boolean') {
    updates.news_enabled = body.news_enabled
  }
  if (typeof body.news_show_breaking_only === 'boolean') {
    updates.news_show_breaking_only = body.news_show_breaking_only
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(updates, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferences: data })
}
