import { getSupabaseServer } from '@/lib/supabase'
import Link from 'next/link'

interface BillScheduleTimelineProps {
  billId: number
  billNumber?: string
}

// Derive the LA Legislature session code (e.g. "26RS") from session_year.
function sessionCode(year: number | null | undefined): string {
  const y = year ?? new Date().getFullYear()
  return `${String(y).slice(-2)}RS`
}

function getOfficialBillUrl(billNumber: string, year: number | null | undefined): string {
  const cleanNumber = billNumber.replace(/\s+/g, '')
  return `https://legis.la.gov/legis/BillInfo.aspx?s=${sessionCode(year)}&b=${cleanNumber}&sbi=y`
}

export default async function BillScheduleTimeline({ billId, billNumber }: BillScheduleTimelineProps) {
  const supabase = getSupabaseServer()

  // Read calendar and history from the Bills table — populated by enhanced-sync.ts
  // from LegiScan on every sync. Avoids dependency on bill_events/bill_schedule tables.
  const { data: bill } = await supabase
    .from('Bills')
    .select('calendar, history, session_year')
    .eq('id', billId)
    .single()

  const calendar: any[] = bill?.calendar || []
  const history: any[] = bill?.history || []
  const year: number | null = bill?.session_year ?? null

  const today = new Date().toISOString().split('T')[0]

  // Map LegiScan history entries → past legislative actions
  const pastEvents = history
    .filter(h => h.date && h.action)
    .map(h => ({
      date: h.date as string,
      type: 'history' as const,
      description: h.action as string,
      chamber: (h.chamber as string) || null,
      importance: (h.importance as number) || 0,
      isPast: true,
      time: null,
      location: null,
    }))

  // Map LegiScan calendar entries → upcoming hearings/floor sessions
  const calendarEvents = calendar
    .filter(c => c.date)
    .map(c => ({
      date: c.date as string,
      type: 'calendar' as const,
      description: (c.description || c.type || 'Scheduled event') as string,
      chamber: null,
      importance: 1,
      isPast: (c.date as string) < today,
      time: (c.time as string) || null,
      location: (c.location as string) || null,
    }))

  const allEvents = [...pastEvents, ...calendarEvents].sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  const officialUrl = billNumber ? getOfficialBillUrl(billNumber, year) : null
  const upcomingCount = calendarEvents.filter(e => !e.isPast).length

  if (allEvents.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#0C2340] mb-4">Bill Schedule</h3>
        <p className="text-slate-500 text-sm text-center py-4">
          No events recorded yet. Committee assignments and floor session dates appear here as the bill progresses.
        </p>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-center text-sm text-[#0C2340] font-semibold hover:underline"
          >
            View Official Bill Page →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#0C2340]">Bill Schedule</h3>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#0C2340] font-semibold flex items-center gap-1 hover:underline"
          >
            Official Page
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200" />

        <div className="space-y-5">
          {allEvents.map((event, idx) => {
            const isToday = event.date === today
            const isFuture = event.date > today
            const isHistory = event.type === 'history'

            const dotClass = isToday
              ? 'bg-[#C4922A] border-[#0C2340]'
              : isFuture
              ? 'bg-white border-slate-300'
              : 'bg-[#0C2340] border-[#0C2340]'

            return (
              <div key={idx} className="relative pl-10">
                <div className={`absolute left-0 w-8 h-8 rounded-full border-4 flex items-center justify-center ${dotClass}`}>
                  {isToday && <div className="w-3 h-3 bg-[#0C2340] rounded-full" />}
                  {!isToday && !isFuture && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className={`pb-1 ${isFuture && !isToday ? 'opacity-80' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isToday ? 'text-[#C4922A]' : isFuture ? 'text-slate-600' : 'text-[#0C2340]'}`}>
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>

                    {isToday && (
                      <span className="px-2 py-0.5 bg-[#C4922A] text-white text-xs font-bold rounded-full">TODAY</span>
                    )}
                    {isFuture && !isToday && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">UPCOMING</span>
                    )}
                    {event.time && (
                      <span className="text-xs text-slate-500">{event.time}</span>
                    )}
                    {event.chamber && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded">
                        {event.chamber === 'H' ? 'House' : event.chamber === 'S' ? 'Senate' : event.chamber}
                      </span>
                    )}
                    {!isHistory && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">SCHEDULED</span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">{event.description}</p>

                  {event.location && (
                    <p className="text-xs text-slate-500 mt-0.5">📍 {event.location}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
        {upcomingCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-[#0C2340]">{upcomingCount}</span>{' '}
              upcoming event{upcomingCount !== 1 ? 's' : ''}
            </span>
            <Link href="/calendar" className="text-[#0C2340] font-semibold hover:underline">
              View Calendar →
            </Link>
          </div>
        )}

        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#0C2340] text-white rounded-lg text-sm font-semibold hover:bg-[#1a3a5c] transition-colors"
          >
            View Full Bill Details on legis.la.gov
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
