import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { buildSundayDigestEmail } from '@/lib/email-templates'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function POST(_req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serverSupabase = getSupabaseServer()

  const { data: watchedBills } = await serverSupabase
    .from('user_bills')
    .select('bill_id, Bills!inner(id, bill_number, title, status, last_action, last_action_date)')
    .eq('user_id', user.id)
    .limit(5)

  const today = new Date()
  const weekOf = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const sessionDaysRemaining = Math.ceil((new Date('2026-06-01').getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const activeBills = ((watchedBills ?? []) as any[]).map((wb) => ({
    bill: {
      id: wb.Bills?.id ?? 0,
      bill_number: wb.Bills?.bill_number ?? '',
      title: wb.Bills?.title ?? '',
      status: wb.Bills?.status ?? '',
      last_action: wb.Bills?.last_action ?? undefined,
      last_action_date: wb.Bills?.last_action_date ?? undefined,
    },
    activities: wb.Bills?.last_action ? [wb.Bills.last_action] : ['No recent activity'],
  }))

  const { subject, html } = buildSundayDigestEmail({
    user: { id: user.id, email: user.email, name: user.email.split('@')[0] },
    weekOf,
    aiNarrative: "This is a test digest sent from your notification settings. Your actual weekly digest will include AI-generated analysis of real activity on your watched bills.",
    activeBills,
    quietBills: [],
    weekAheadEvents: [],
    sessionSnapshot: {
      sessionName: '2026 Regular Session',
      daysRemaining: sessionDaysRemaining,
      userWatchedTotal: activeBills.length,
      userWatchedActive: activeBills.length,
      userWatchedDead: 0,
      lastSyncedAt: new Date().toISOString(),
    },
    includeOptions: {
      aiNarrative: true,
      billSummaries: true,
      voteResults: true,
      amendments: true,
      weekAhead: false,
      sessionSnapshot: true,
      quietBills: false,
    },
  })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: user.email,
    subject: `[TEST] ${subject}`,
    html,
  })

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  return NextResponse.json({ ok: true, sentTo: user.email })
}
