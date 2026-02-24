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

// Classify history actions into icon/color types
function classifyAction(action: string): { icon: string; color: string; label: string } {
  const a = action.toLowerCase()
  if (a.includes('passed') || a.includes('enrolled') || a.includes('chaptered')) {
    return { icon: '✓', color: 'bg-green-600 border-green-600', label: 'passed' }
  }
  if (a.includes('vetoed') || a.includes('failed') || a.includes('defeated') || a.includes('rejected')) {
    return { icon: '✗', color: 'bg-red-500 border-red-500', label: 'failed' }
  }
  if (a.includes('signed') || a.includes('governor')) {
    return { icon: '✍', color: 'bg-purple-600 border-purple-600', label: 'executive' }
  }
  if (a.includes('vote') || a.includes('yeas') || a.includes('nays')) {
    return { icon: '⬤', color: 'bg-blue-600 border-blue-600', label: 'vote' }
  }
  if (a.includes('committee') || a.includes('referred') || a.includes('assigned')) {
    return { icon: '◆', color: 'bg-amber-500 border-amber-500', label: 'committee' }
  }
  if (a.includes('introduced') || a.includes('filed') || a.includes('pre-filed')) {
    return { icon: '●', color: 'bg-slate-400 border-slate-400', label: 'filed' }
  }
  if (a.includes('amended') || a.includes('amendment')) {
    return { icon: '✎', color: 'bg-orange-500 border-orange-500', label: 'amended' }
  }
  return { icon: '●', color: 'bg-[#0C2340] border-[#0C2340]', label: 'action' }
}

// Find vote record closest to a history entry date
function findVoteForAction(votes: any[], date: string) {
  return votes.find(v => v.date === date || (v.date && Math.abs(new Date(v.date).getTime() - new Date(date).getTime()) < 2 * 24 * 60 * 60 * 1000))
}

export default async function BillScheduleTimeline({ billId, billNumber }: BillScheduleTimelineProps) {
  const supabase = getSupabaseServer()

  const { data: bill } = await supabase
    .from('Bills')
    .select('calendar, history, votes, amendments, session_year')
    .eq('id', billId)
    .single()

  const calendar: any[] = bill?.calendar || []
  const history: any[] = bill?.history || []
  const votes: any[] = bill?.votes || []
  const amendments: any[] = bill?.amendments || []
  const year: number | null = bill?.session_year ?? null

  const today = new Date().toISOString().split('T')[0]

  // Map LegiScan history entries → past legislative actions
  const pastEvents = history
    .filter(h => h.date && h.action)
    .map(h => {
      const actionClass = classifyAction(h.action as string)
      const vote = findVoteForAction(votes, h.date as string)
      return {
        date: h.date as string,
        type: 'history' as const,
        description: h.action as string,
        chamber: (h.chamber as string) || null,
        importance: (h.importance as number) || 0,
        isPast: true,
        time: null,
        location: null,
        actionClass,
        vote,
      }
    })

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
      actionClass: { icon: '◆', color: 'bg-blue-500 border-blue-500', label: 'scheduled' },
      vote: null,
    }))

  const allEvents = [...pastEvents, ...calendarEvents].sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  // Pending amendments (not yet incorporated)
  const pendingAmendments = amendments.filter((a: any) => a.adopted === 0)

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

      {/* Pending amendments notice */}
      {pendingAmendments.length > 0 && (
        <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
          <span className="font-semibold">{pendingAmendments.length} pending amendment{pendingAmendments.length !== 1 ? 's' : ''}</span>
          {' '}— not yet adopted
        </div>
      )}

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
              : event.actionClass.color

            return (
              <div key={idx} className="relative pl-10">
                <div className={`absolute left-0 w-8 h-8 rounded-full border-4 flex items-center justify-center text-white text-xs font-bold ${dotClass}`}>
                  {isToday && <div className="w-3 h-3 bg-[#0C2340] rounded-full" />}
                  {!isToday && !isFuture && (
                    <span>{event.actionClass.icon}</span>
                  )}
                  {isFuture && !isToday && (
                    <span className="text-slate-400 text-xs">→</span>
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

                  {/* Vote counts */}
                  {event.vote && (event.vote.yea > 0 || event.vote.nay > 0) && (
                    <div className="mt-1 flex gap-3 text-xs">
                      <span className="text-green-700 font-semibold">✓ {event.vote.yea} Yea</span>
                      <span className="text-red-600 font-semibold">✗ {event.vote.nay} Nay</span>
                      {event.vote.absent > 0 && (
                        <span className="text-slate-500">{event.vote.absent} Absent</span>
                      )}
                    </div>
                  )}

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
