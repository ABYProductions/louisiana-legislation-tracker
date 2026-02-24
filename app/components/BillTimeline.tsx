// BillTimeline displays every legislative action recorded in the bill's history[]
// array. Content mirrors the history table on legis.la.gov (date, chamber, action text).

interface HistoryEvent {
  date: string
  action: string
  chamber: string
  chamber_id: number
  importance: number
}

interface BillTimelineProps {
  history: HistoryEvent[]
}

export default function BillTimeline({ history }: BillTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-[#0C2340] mb-4">Bill History</h3>
        <p className="text-slate-500 text-sm">No history available yet.</p>
      </div>
    )
  }

  // Show oldest-first (chronological) — same order as the LA Legislature history table
  const sortedHistory = [...history]
    .filter(e => e.date && e.action)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const chamberLabel = (chamber: string) => {
    if (chamber === 'H') return 'House'
    if (chamber === 'S') return 'Senate'
    return chamber || null
  }

  const getStyle = (action: string) => {
    const a = action.toLowerCase()
    if (a.includes('passed') || a.includes('enrolled') || a.includes('chaptered') || a.includes('signed') || a.includes('adopted')) {
      return { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-900' }
    }
    if (a.includes('vetoed') || a.includes('failed') || a.includes('defeated') || a.includes('rejected')) {
      return { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900' }
    }
    if (a.includes('vote') || a.includes('yeas') || a.includes('nays')) {
      return { dot: 'bg-blue-600', bg: 'bg-blue-50', text: 'text-blue-900' }
    }
    if (a.includes('committee') || a.includes('referred') || a.includes('assigned')) {
      return { dot: 'bg-[#0C2340]', bg: 'bg-slate-50', text: 'text-slate-800' }
    }
    if (a.includes('calendar') || a.includes('hearing') || a.includes('scheduled')) {
      return { dot: 'bg-[#C4922A]', bg: 'bg-amber-50', text: 'text-amber-900' }
    }
    if (a.includes('amended') || a.includes('amendment')) {
      return { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-900' }
    }
    return { dot: 'bg-slate-400', bg: 'bg-white', text: 'text-slate-700' }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-[#0C2340] mb-6">Bill History</h3>

      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />

        <div className="space-y-3">
          {sortedHistory.map((event, index) => {
            const style = getStyle(event.action)
            const isLatest = index === sortedHistory.length - 1
            const label = chamberLabel(event.chamber)

            return (
              <div key={index} className="relative flex gap-4">
                <div className={`relative z-10 w-4 h-4 rounded-full ${style.dot} flex-shrink-0 mt-1.5 ring-4 ring-white`} />

                <div className={`flex-1 ${style.bg} rounded-lg px-3 py-2.5 ${isLatest ? 'ring-2 ring-[#C4922A]' : 'border border-slate-100'}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatDate(event.date)}
                    </span>
                    {label && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                        {label}
                      </span>
                    )}
                    {isLatest && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#C4922A] text-white font-semibold">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${style.text}`}>
                    {event.action}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
