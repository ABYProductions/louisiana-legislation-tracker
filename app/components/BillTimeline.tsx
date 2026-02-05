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
        <h3 className="text-lg font-bold text-[#002868] mb-4">Bill Timeline</h3>
        <p className="text-slate-500">No history available yet.</p>
      </div>
    )
  }

  // Sort by date (oldest first for timeline)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getActionStyle = (action: string, importance: number) => {
    const actionLower = action.toLowerCase()
    
    // Milestone events (green)
    if (actionLower.includes('passed') || actionLower.includes('adopted') || actionLower.includes('signed')) {
      return {
        dot: 'bg-emerald-500',
        line: 'border-emerald-200',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800'
      }
    }
    
    // Negative events (red)
    if (actionLower.includes('failed') || actionLower.includes('rejected') || actionLower.includes('vetoed')) {
      return {
        dot: 'bg-red-500',
        line: 'border-red-200',
        bg: 'bg-red-50',
        text: 'text-red-800'
      }
    }
    
    // Committee/referral events (blue)
    if (actionLower.includes('committee') || actionLower.includes('referred')) {
      return {
        dot: 'bg-[#002868]',
        line: 'border-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-800'
      }
    }
    
    // Calendar/scheduling events (gold)
    if (actionLower.includes('calendar') || actionLower.includes('scheduled') || actionLower.includes('hearing')) {
      return {
        dot: 'bg-[#f4c430]',
        line: 'border-yellow-200',
        bg: 'bg-yellow-50',
        text: 'text-yellow-800'
      }
    }
    
    // Important events based on importance flag
    if (importance >= 1) {
      return {
        dot: 'bg-[#002868]',
        line: 'border-slate-200',
        bg: 'bg-slate-50',
        text: 'text-slate-800'
      }
    }
    
    // Default (gray for minor events)
    return {
      dot: 'bg-slate-400',
      line: 'border-slate-200',
      bg: 'bg-white',
      text: 'text-slate-600'
    }
  }

  const getChamberLabel = (chamber: string) => {
    switch (chamber) {
      case 'H': return 'House'
      case 'S': return 'Senate'
      default: return chamber
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-[#002868] mb-6">Bill Timeline</h3>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />
        
        <div className="space-y-4">
          {sortedHistory.map((event, index) => {
            const style = getActionStyle(event.action, event.importance)
            const isLast = index === sortedHistory.length - 1
            
            return (
              <div key={index} className="relative flex gap-4">
                {/* Dot */}
                <div className={`relative z-10 w-4 h-4 rounded-full ${style.dot} flex-shrink-0 mt-1 ring-4 ring-white`} />
                
                {/* Content */}
                <div className={`flex-1 ${style.bg} rounded-lg p-3 ${isLast ? 'ring-2 ring-[#f4c430]' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatDate(event.date)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      {getChamberLabel(event.chamber)}
                    </span>
                    {isLast && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#f4c430] text-[#002868] font-semibold">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${style.text}`}>
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