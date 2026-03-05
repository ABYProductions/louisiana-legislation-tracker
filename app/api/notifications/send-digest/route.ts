import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildSundayDigestEmail, buildDailyDigestEmail } from '@/lib/email-templates'
import { generateWeekInReviewNarrative } from '@/lib/generate-digest-narrative'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const digestType: 'weekly' | 'daily' = body.type || 'daily'

  const admin = getSupabaseServiceRole()
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const today = new Date()
  const isSunday = today.getDay() === 0

  const frequencyFilter = digestType === 'weekly'
    ? ['weekly']
    : ['daily', 'twice_week', 'live_alert']

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('user_id, email_frequency, digest_vote_results, digest_ai_analysis')
    .eq('email_opt_in', true)
    .in('email_frequency', frequencyFilter)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const pref of prefs) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(pref.user_id)
      if (!authUser?.user?.email) continue

      const userEmail = authUser.user.email

      const { data: watchedBills } = await admin
        .from('user_bills')
        .select('bill_id, Bills!inner(id, bill_number, title, status, last_action, last_action_date)')
        .eq('user_id', pref.user_id)
        .limit(20)

      if (!watchedBills || watchedBills.length === 0) continue

      const cutoff = new Date(today)
      cutoff.setDate(cutoff.getDate() - (digestType === 'weekly' ? 7 : 1))
      const cutoffStr = cutoff.toISOString().split('T')[0]

      const typedBills = (watchedBills as any[])
      const activeBillsRaw = typedBills.filter(wb => (wb.Bills?.last_action_date ?? '') >= cutoffStr)
      const quietBillsRaw = typedBills.filter(wb => (wb.Bills?.last_action_date ?? '') < cutoffStr)

      const weekOf = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const sessionDaysRemaining = Math.ceil((new Date('2026-06-01').getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const userName = userEmail.split('@')[0]

      let emailData: { subject: string; html: string }

      if (digestType === 'weekly' || isSunday) {
        let aiNarrative = 'Your watched bills had activity this week. See the breakdown below.'
        if (activeBillsRaw.length > 0 && pref.digest_ai_analysis) {
          try {
            aiNarrative = await generateWeekInReviewNarrative({
              userName,
              weekOf,
              activeBills: activeBillsRaw.map((wb: any) => ({
                bill_number: wb.Bills?.bill_number ?? '',
                title: wb.Bills?.title ?? '',
                currentStatus: wb.Bills?.status ?? '',
                lastAction: wb.Bills?.last_action ?? '',
                lastActionDate: wb.Bills?.last_action_date ?? '',
                recentActivity: wb.Bills?.last_action ? [wb.Bills.last_action] : [],
              })),
              sessionDaysRemaining,
              totalWatchedBills: typedBills.length,
            })
          } catch { /* use fallback */ }
        }

        const activeBills = activeBillsRaw.map((wb: any) => ({
          bill: {
            id: wb.Bills?.id ?? 0,
            bill_number: wb.Bills?.bill_number ?? '',
            title: wb.Bills?.title ?? '',
            status: wb.Bills?.status ?? '',
            last_action: wb.Bills?.last_action ?? undefined,
            last_action_date: wb.Bills?.last_action_date ?? undefined,
          },
          activities: wb.Bills?.last_action ? [wb.Bills.last_action] : [],
        }))

        const quietBills = pref.digest_vote_results ? quietBillsRaw.map((wb: any) => ({
          id: wb.Bills?.id ?? 0,
          bill_number: wb.Bills?.bill_number ?? '',
          title: wb.Bills?.title ?? '',
          status: wb.Bills?.status ?? '',
          last_action: wb.Bills?.last_action ?? undefined,
        })) : []

        emailData = buildSundayDigestEmail({
          user: { id: pref.user_id, email: userEmail, name: userName },
          weekOf,
          aiNarrative,
          activeBills,
          quietBills,
          weekAheadEvents: [],
          sessionSnapshot: {
            sessionName: '2026 Regular Session',
            daysRemaining: sessionDaysRemaining,
            userWatchedTotal: typedBills.length,
            userWatchedActive: activeBillsRaw.length,
            userWatchedDead: 0,
            lastSyncedAt: new Date().toISOString(),
          },
          includeOptions: {
            aiNarrative: pref.digest_ai_analysis ?? true,
            billSummaries: true,
            voteResults: pref.digest_vote_results ?? true,
            amendments: true,
            weekAhead: false,
            sessionSnapshot: true,
            quietBills: pref.digest_vote_results ?? true,
          },
        })
      } else {
        if (activeBillsRaw.length === 0) continue

        emailData = buildDailyDigestEmail({
          user: { id: pref.user_id, email: userEmail, name: userName },
          dateLabel: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          activeBills: activeBillsRaw.map((wb: any) => ({
            bill: {
              id: wb.Bills?.id ?? 0,
              bill_number: wb.Bills?.bill_number ?? '',
              title: wb.Bills?.title ?? '',
              status: wb.Bills?.status ?? '',
            },
            activity: wb.Bills?.last_action ?? 'Recent activity',
          })),
        })
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: userEmail,
        subject: emailData.subject,
        html: emailData.html,
      })

      sent++
    } catch (err) {
      console.error(`Digest send failed for user ${pref.user_id}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: prefs.length })
}
