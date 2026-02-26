import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 3600

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function toIcsDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  return dateStr.replace(/-/g, '')
}

function toIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'committee_hearing': return 'Committee Hearing'
    case 'floor_session':     return 'Floor Session'
    case 'vote':              return 'Vote'
    case 'executive_action':  return 'Executive Action'
    case 'hearing':           return 'Hearing'
    default:                  return 'Legislative Event'
  }
}

export async function GET() {
  const supabase = getSupabaseServer()

  const today = new Date().toISOString().split('T')[0]
  const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: events, error } = await supabase
    .from('legislative_calendar')
    .select('*')
    .gte('event_date', today)
    .lte('event_date', ninetyDays)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: false })
    .limit(500)

  if (error) {
    return new NextResponse('Error fetching calendar data', { status: 500 })
  }

  const now = toIcsTimestamp(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SessionSource//Louisiana Legislature 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Louisiana Legislature 2026',
    'X-WR-CALDESC:2026 Louisiana Regular Session legislative events',
    'X-WR-TIMEZONE:America/Chicago',
  ]

  for (const evt of (events || [])) {
    const billNumbers: string[] = evt.bill_numbers || []
    const typeLabel = eventTypeLabel(evt.event_type)
    const committee = evt.committee_name || ''
    const chamber = evt.chamber === 'H' ? 'House' : evt.chamber === 'S' ? 'Senate' : (evt.chamber || '')

    const summary = committee
      ? `${typeLabel} — ${committee}`
      : chamber
        ? `${typeLabel} — ${chamber}`
        : typeLabel

    const descParts: string[] = []
    if (chamber) descParts.push(`Chamber: ${chamber}`)
    if (billNumbers.length > 0) descParts.push(`Bills: ${billNumbers.join(', ')}`)
    if (evt.event_time) descParts.push(`Time: ${evt.event_time}`)

    const uid = `${evt.id || `${evt.event_date}-${Math.random().toString(36).slice(2)}`}@sessionsource.net`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(evt.event_date)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(evt.event_date)}`)
    lines.push(`SUMMARY:${escapeIcs(summary)}`)
    if (descParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcs(descParts.join('\\n'))}`)
    }
    if (evt.location) {
      lines.push(`LOCATION:${escapeIcs(evt.location)}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const ics = lines.join('\r\n') + '\r\n'

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="louisiana-legislature-2026.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
