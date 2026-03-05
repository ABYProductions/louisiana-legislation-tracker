import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildAlertEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getSupabaseServiceRole()
  const resend = new Resend(process.env.RESEND_API_KEY!)

  // Get recent bill events from the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: recentEvents } = await admin
    .from('bill_events')
    .select('id, bill_id, event_type, description, event_date, Bills!inner(id, bill_number, title, status)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!recentEvents || recentEvents.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_events' })
  }

  // Map event types to preference fields and alert event types
  const eventTypeMap: Record<string, { prefField: string; alertType: string }> = {
    'floor_vote': { prefField: 'alert_floor_vote', alertType: 'floor_vote' },
    'vote': { prefField: 'alert_floor_vote', alertType: 'floor_vote' },
    'committee_hearing': { prefField: 'alert_committee_hearing', alertType: 'committee_hearing' },
    'hearing': { prefField: 'alert_committee_hearing', alertType: 'committee_hearing' },
    'signed': { prefField: 'alert_signed_into_law', alertType: 'governor_action' },
    'enacted': { prefField: 'alert_signed_into_law', alertType: 'governor_action' },
    'vetoed': { prefField: 'alert_vetoed', alertType: 'governor_action' },
    'veto': { prefField: 'alert_vetoed', alertType: 'governor_action' },
    'amendment': { prefField: 'alert_amended', alertType: 'bill_amended' },
    'amended': { prefField: 'alert_amended', alertType: 'bill_amended' },
  }

  let sent = 0
  let failed = 0

  for (const event of (recentEvents as any[])) {
    const bill = event.Bills
    if (!bill) continue

    const eventTypeLower = (event.event_type || '').toLowerCase()
    const mapping = Object.entries(eventTypeMap).find(([key]) => eventTypeLower.includes(key))?.[1]
    if (!mapping) continue

    const { data: watchers } = await admin
      .from('user_bills')
      .select('user_id')
      .eq('bill_id', event.bill_id)

    if (!watchers || watchers.length === 0) continue

    const userIds = watchers.map((w: any) => w.user_id)

    const { data: eligiblePrefs } = await admin
      .from('notification_preferences')
      .select('user_id')
      .eq('email_opt_in', true)
      .eq(mapping.prefField, true)
      .in('user_id', userIds)

    if (!eligiblePrefs || eligiblePrefs.length === 0) continue

    for (const pref of eligiblePrefs as any[]) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(pref.user_id)
        if (!authUser?.user?.email) continue

        const userEmail = authUser.user.email
        const { subject, html } = buildAlertEmail({
          user: { id: pref.user_id, email: userEmail, name: userEmail.split('@')[0] },
          bill: {
            id: bill.id,
            bill_number: bill.bill_number,
            title: bill.title,
            status: bill.status,
          },
          eventType: mapping.alertType as any,
          eventDetails: event.description || `${event.event_type} recorded on ${event.event_date || 'recent date'}.`,
          scheduledDate: event.event_date || undefined,
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: userEmail,
          subject,
          html,
        })

        sent++
      } catch (err) {
        console.error(`Alert send failed:`, err)
        failed++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, failed, eventsProcessed: recentEvents.length })
}
