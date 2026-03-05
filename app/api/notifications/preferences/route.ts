import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { buildWelcomeEmail } from '@/lib/email-templates'
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
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ preferences: data })
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const serverSupabase = getSupabaseServer()

  // Check if this is first opt-in
  const { data: existing } = await serverSupabase
    .from('notification_preferences')
    .select('email_opt_in')
    .eq('user_id', user.id)
    .maybeSingle()

  const isFirstOptIn = !existing?.email_opt_in && body.email_opt_in === true

  const { error } = await serverSupabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      ...body,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send welcome email on first opt-in
  if (isFirstOptIn && user.email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { subject, html } = buildWelcomeEmail({ id: user.id, email: user.email })
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject,
        html,
      })
    } catch (err) {
      console.error('Welcome email failed:', err)
    }
  }

  await logActivity(
    user.id,
    'notification_preferences_updated',
    body.email_opt_in === false ? 'Unsubscribed from email notifications' : 'Updated notification preferences'
  )

  return NextResponse.json({ ok: true })
}
