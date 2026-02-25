import { getSupabaseServer } from '@/lib/supabase'
import Link from 'next/link'

interface UpcomingEventsPanelProps {
  billId: number
  billNumber?: string
  sessionYear?: number | null
}

function sessionCode(year: number | null | undefined): string {
  const y = year ?? new Date().getFullYear()
  return `${String(y).slice(-2)}RS`
}

function buildIcs(events: any[], billNumber: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Louisiana Legislation Tracker//EN',
    'CALSCALE:GREGORIAN',
  ]
  for (const evt of events) {
    const dateStr = evt.date.replace(/-/g, '')
    const uid = `${billNumber}-${evt.date}-${Date.now()}@legis-tracker`
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`SUMMARY:${billNumber} — ${evt.description}`)
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`)
    lines.push(`DTEND;VALUE=DATE:${dateStr}`)
    if (evt.location) lines.push(`LOCATION:${evt.location}`)
    lines.push(`DESCRIPTION:${evt.description}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export default async function UpcomingEventsPanel({ billId, billNumber, sessionYear }: UpcomingEventsPanelProps) {
  const supabase = getSupabaseServer()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: bill } = await supabase
    .from('Bills')
    .select('next_event, upcoming_events')
    .eq('id', billId)
    .single()

  const upcomingEvents: any[] = (bill?.upcoming_events || []).filter(
    (e: any) => e.date && e.date >= today
  )

  if (upcomingEvents.length === 0) return null

  const nextEvent = upcomingEvents[0]
  const isToday = nextEvent.date === today
  const isTomorrow = nextEvent.date === tomorrow

  const officialUrl = billNumber
    ? `https://legis.la.gov/legis/BillInfo.aspx?s=${sessionCode(sessionYear)}&b=${(billNumber).replace(/\s+/g, '')}&sbi=y`
    : null

  return (
    <div className="bg-white rounded-xl border-2 border-[var(--gold)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--navy)' }}>
        <h3 className="text-white font-bold text-base">Upcoming Events</h3>
        <span className="text-xs text-blue-200">{upcomingEvents.length} scheduled</span>
      </div>

      {/* Next event — gold accent */}
      <div className="bg-amber-50 border-b border-amber-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-lg px-2 py-1 text-center min-w-[48px]" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
            <div className="text-xs font-bold uppercase">
              {new Date(nextEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div className="text-xl font-bold leading-none">
              {new Date(nextEvent.date + 'T00:00:00').getDate()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
              {isToday && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>TODAY</span>
              )}
              {isTomorrow && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">TOMORROW</span>
              )}
              {!isToday && !isTomorrow && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">NEXT UP</span>
              )}
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--navy)' }}>{nextEvent.description}</p>
            {nextEvent.time && (
              <p className="text-xs text-slate-500 mt-0.5">{nextEvent.time}</p>
            )}
            {nextEvent.location && (
              <p className="text-xs text-slate-500 mt-0.5">📍 {nextEvent.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Remaining events */}
      {upcomingEvents.slice(1).length > 0 && (
        <div className="divide-y divide-slate-100">
          {upcomingEvents.slice(1).map((evt: any, idx: number) => {
            const evtDate = new Date(evt.date + 'T00:00:00')
            return (
              <div key={idx} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 text-center">
                  <div className="text-xs text-slate-500 uppercase font-semibold">
                    {evtDate.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{evtDate.getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium leading-snug truncate">{evt.description}</p>
                  {evt.time && <p className="text-xs text-slate-400">{evt.time}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold hover:underline" style={{ color: 'var(--navy)' }}
          >
            Official Bill Page →
          </a>
        )}
        <Link href="/calendar" className="text-xs hover:underline ml-auto" style={{ color: 'var(--text-muted)' }}>
          Full Calendar
        </Link>
      </div>
    </div>
  )
}
