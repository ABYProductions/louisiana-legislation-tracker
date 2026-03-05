import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logActivity } from '@/lib/activity-log'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function GET(_req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serverSupabase = getSupabaseServer()
  const { data, error } = await serverSupabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    profile: data,
    email: user.email,
    created_at: user.created_at,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, bio, location } = body

  const serverSupabase = getSupabaseServer()
  const { error } = await serverSupabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      display_name: display_name?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(user.id, 'profile_updated', 'Updated profile information')

  return NextResponse.json({ ok: true })
}
