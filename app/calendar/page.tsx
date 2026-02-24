import { getSupabaseServer } from '@/lib/supabase'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

// Always fetch fresh — calendar changes throughout session
export const revalidate = 0

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'committee_hearing': return 'Committee'
    case 'floor_session':     return 'Floor'
    case 'vote':              return 'Vote'
    case 'executive_action':  return 'Executive'
    case 'hearing':           return 'Hearing'
    default:                  return 'Event'
  }
}

function eventTypeBadgeClass(type: string): string {
  switch (type) {
    case 'committee_hearing': return 'bg-purple-100 text-purple-700'
    case 'floor_session':     return 'bg-blue-100 text-blue-700'
    case 'vote':              return 'bg-green-100 text-green-700'
    case 'executive_action':  return 'bg-rose-100 text-rose-700'
    default:                  return 'bg-slate-100 text-slate-600'
  }
}

function chamberBadgeClass(chamber: string | null): string {
  if (chamber === 'H') return 'bg-emerald-100 text-emerald-700'
  if (chamber === 'S') return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}

export default async function CalendarPage() {
  const supabase = getSupabaseServer()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch upcoming calendar events from our aggregated table
  const { data: calendarEvents } = await supabase
    .from('legislative_calendar')
    .select('*')
    .gte('event_date', today)
    .lte('event_date', thirtyDays)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: false })
    .limit(500)

  // Fetch bills that have upcoming events — for the "bills with scheduled events" count
  const { data: billsWithEvents } = await supabase
    .from('Bills')
    .select('id, bill_number, title, next_event, status')
    .not('next_event', 'is', null)
    .order('next_event->date', { ascending: true })
    .limit(200)

  const events = calendarEvents || []
  const billsScheduled = billsWithEvents || []

  // Group calendar events by date
  const eventsByDate = new Map<string, typeof events>()
  for (const evt of events) {
    const key = evt.event_date
    if (!eventsByDate.has(key)) eventsByDate.set(key, [])
    eventsByDate.get(key)!.push(evt)
  }
  const dateGroups = Array.from(eventsByDate.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const totalBillsInCalendar = new Set(
    events.flatMap((e: any) => (e.bill_ids as number[] || []))
  ).size

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-7xl">

          {/* Page header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-[#C4922A] hover:underline mb-4 font-medium text-sm uppercase tracking-wider">
              ← All Bills
            </Link>
            <div className="bg-[#0C2340] rounded-2xl p-8 text-white">
              <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                Legislative Calendar
              </h1>
              <p className="text-blue-200 text-base mb-4">2026 Regular Session — Next 30 Days</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-[#C4922A] font-bold text-2xl">{events.length}</span>
                  <span className="text-blue-200 ml-2">scheduled events</span>
                </div>
                <div>
                  <span className="text-[#C4922A] font-bold text-2xl">{totalBillsInCalendar}</span>
                  <span className="text-blue-200 ml-2">bills with hearings</span>
                </div>
                <div>
                  <span className="text-[#C4922A] font-bold text-2xl">{dateGroups.length}</span>
                  <span className="text-blue-200 ml-2">active days</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left column: 30-day event feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#0C2340]">Upcoming Schedule</h2>
                <a
                  href="https://legis.la.gov/legis/SessionInfo.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0C2340] font-semibold hover:underline"
                >
                  Official Legislature Calendar →
                </a>
              </div>

              {dateGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-slate-500 text-lg mb-2">No scheduled events in the next 30 days</p>
                  <p className="text-slate-400 text-sm">
                    Events appear here after each sync as the legislature schedules hearings and floor sessions.
                  </p>
                  <a
                    href="https://legis.la.gov/legis/SessionInfo.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-6 px-4 py-2 bg-[#0C2340] text-white rounded-lg text-sm font-semibold hover:bg-[#1a3a5c] transition-colors"
                  >
                    View Official Legislature Calendar
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {dateGroups.map(([date, dayEvents]) => {
                    const dateObj = new Date(date + 'T00:00:00')
                    const isToday = date === today
                    const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split('T')[0]

                    return (
                      <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Date header */}
                        <div className={`px-5 py-3 flex items-center justify-between ${isToday ? 'bg-[#C4922A]' : 'bg-[#0C2340]'}`}>
                          <div className="flex items-center gap-3">
                            <div className="text-white text-center min-w-[36px]">
                              <div className="text-xs font-bold uppercase opacity-80">
                                {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className="text-2xl font-bold leading-none">{dateObj.getDate()}</div>
                            </div>
                            <div>
                              <div className="text-white font-semibold">
                                {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                              </div>
                              {isToday && (
                                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Today</span>
                              )}
                              {isTomorrow && (
                                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Tomorrow</span>
                              )}
                            </div>
                          </div>
                          <div className="text-white/70 text-sm">
                            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Events for this day */}
                        <div className="divide-y divide-slate-100">
                          {dayEvents.map((evt: any, idx: number) => {
                            const billIds: number[] = evt.bill_ids || []
                            const billNumbers: string[] = evt.bill_numbers || []

                            return (
                              <div key={idx} className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 pt-0.5 flex gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${eventTypeBadgeClass(evt.event_type)}`}>
                                      {eventTypeLabel(evt.event_type)}
                                    </span>
                                    {evt.chamber && (
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${chamberBadgeClass(evt.chamber)}`}>
                                        {evt.chamber === 'H' ? 'House' : evt.chamber === 'S' ? 'Senate' : evt.chamber}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2">
                                  <h4 className="font-semibold text-[#0C2340] text-sm">
                                    {evt.committee_name || eventTypeLabel(evt.event_type)}
                                  </h4>
                                  {evt.event_time && (
                                    <p className="text-xs text-slate-500 mt-0.5">{evt.event_time}</p>
                                  )}
                                  {evt.location && (
                                    <p className="text-xs text-slate-500 mt-0.5">📍 {evt.location}</p>
                                  )}
                                </div>

                                {/* Bills in this event */}
                                {billNumbers.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {billNumbers.slice(0, 8).map((num: string, i: number) => (
                                      <Link
                                        key={i}
                                        href={billIds[i] ? `/bill/${billIds[i]}` : '#'}
                                        className="px-2 py-0.5 bg-slate-100 text-[#0C2340] text-xs font-semibold rounded hover:bg-[#0C2340] hover:text-white transition-colors"
                                      >
                                        {num}
                                      </Link>
                                    ))}
                                    {billNumbers.length > 8 && (
                                      <span className="text-xs text-slate-500 py-0.5">
                                        +{billNumbers.length - 8} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column: bills with next events */}
            <div>
              <h2 className="text-xl font-bold text-[#0C2340] mb-4">Bills With Hearings</h2>

              {billsScheduled.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  <p className="text-slate-400 text-sm">No bills have upcoming events scheduled yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {billsScheduled.slice(0, 30).map((bill: any) => {
                      const evt = bill.next_event as any
                      if (!evt) return null
                      const evtDate = new Date(evt.date + 'T00:00:00')
                      const isToday = evt.date === today
                      const isTomorrow = evt.date === new Date(Date.now() + 86400000).toISOString().split('T')[0]

                      return (
                        <Link
                          key={bill.id}
                          href={`/bill/${bill.id}`}
                          className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 text-center min-w-[40px]">
                              <div className="text-xs text-slate-500 uppercase font-semibold">
                                {evtDate.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className={`text-lg font-bold ${isToday ? 'text-[#C4922A]' : 'text-[#0C2340]'}`}>
                                {evtDate.getDate()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-[#C4922A] uppercase tracking-wide">
                                  {bill.bill_number}
                                </span>
                                {isToday && (
                                  <span className="px-1.5 py-0.5 bg-[#C4922A] text-white text-xs font-bold rounded">TODAY</span>
                                )}
                                {isTomorrow && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">TOMORROW</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-1">
                                {bill.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {evt.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                  {billsScheduled.length > 30 && (
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 text-center">
                      +{billsScheduled.length - 30} more bills with upcoming events
                    </div>
                  )}
                </div>
              )}

              {/* Official links */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#0C2340] uppercase tracking-wide">Official Resources</h3>
                {[
                  { label: 'House Committee Agendas', href: 'https://house.louisiana.gov/H_Cmtes/H_CmteAgendasPending' },
                  { label: 'Senate Committee Agendas', href: 'https://senate.la.gov/Committees/Agenda.asp' },
                  { label: 'Full Session Calendar', href: 'https://legis.la.gov/legis/SessionInfo.aspx' },
                  { label: 'House Floor Schedule', href: 'https://house.louisiana.gov' },
                  { label: 'Senate Floor Schedule', href: 'https://senate.la.gov' },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-[#0C2340] hover:text-[#C4922A] font-medium transition-colors"
                  >
                    {link.label}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
