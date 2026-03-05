import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildSundayDigestEmail } from '@/lib/email-templates'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function GET(req: NextRequest) {
  let user: { id: string; email?: string } | null = null

  // Try Bearer token first (from browser fetch with Authorization header)
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const serverSupabaseForAuth = getSupabaseServer()
    const { data } = await serverSupabaseForAuth.auth.getUser(token)
    user = data.user
  }

  // Fall back to cookie-based session
  if (!user) {
    const supabase = await getAuthClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serverSupabase = getSupabaseServer()

  const { data: watchedBills } = await serverSupabase
    .from('user_bills')
    .select('bill_id, Bills!inner(id, bill_number, title, status, last_action, last_action_date)')
    .eq('user_id', user.id)
    .limit(10)

  const today = new Date()
  const weekOf = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const sessionDaysRemaining = Math.ceil((new Date('2026-06-01').getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const activeBills = ((watchedBills ?? []) as any[]).slice(0, 5).map((wb) => ({
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

  const quietBills = ((watchedBills ?? []) as any[]).slice(5).map((wb) => ({
    id: wb.Bills?.id ?? 0,
    bill_number: wb.Bills?.bill_number ?? '',
    title: wb.Bills?.title ?? '',
    status: wb.Bills?.status ?? '',
    last_action: wb.Bills?.last_action ?? undefined,
  }))

  const { html } = buildSundayDigestEmail({
    user: { id: user.id, email: user.email ?? '', name: user.email?.split('@')[0] },
    weekOf,
    aiNarrative: "This is a preview of your weekly digest. Your actual digest will contain AI-generated analysis of the week's most significant developments across your watched bills.",
    activeBills,
    quietBills,
    weekAheadEvents: [],
    sessionSnapshot: {
      sessionName: '2026 Regular Session',
      daysRemaining: sessionDaysRemaining,
      userWatchedTotal: watchedBills?.length ?? 0,
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
      quietBills: true,
    },
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
