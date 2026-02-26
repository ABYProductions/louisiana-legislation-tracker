import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServiceRole } from '@/lib/supabase'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const host = req.headers.get('host') || 'sessionsource.net'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function GET() {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('shared_watchlists')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shares: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const share_type = body.share_type === 'folder' ? 'folder' : 'full_watchlist'

  const insert: Record<string, unknown> = {
    user_id: user.id,
    share_type,
    title: body.title?.trim() || null,
  }

  if (share_type === 'folder') {
    if (!body.folder_id) return NextResponse.json({ error: 'folder_id required for folder share' }, { status: 400 })
    insert.folder_id = body.folder_id
  }

  const { data, error } = await supabase
    .from('shared_watchlists')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = getBaseUrl(req)
  return NextResponse.json({
    share_token: data.share_token,
    share_url: `${baseUrl}/shared/${data.share_token}`,
    share: data,
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.share_token) return NextResponse.json({ error: 'share_token is required' }, { status: 400 })

  const { error } = await supabase
    .from('shared_watchlists')
    .update({ is_active: false })
    .eq('share_token', body.share_token)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
