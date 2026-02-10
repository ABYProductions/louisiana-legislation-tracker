'use client'

interface BillChange {
  id: string
  change_type: string
  description: string
  significance: string
  detected_at: string
  session_date: string | null
}

interface BillChangeHistoryProps {
  billId: number
}

export default function BillChangeHistory({ billId }: BillChangeHistoryProps) {
  // This will fetch from your database in the future
  // For now, showing the structure
  
  const mockChanges: BillChange[] = [
    {
      id: '1',
      change_type: 'status_change',
      description: 'Bill passed committee',
      significance: 'major',
      detected_at: '2025-03-15T10:00:00Z',
      session_date: '2025-03-15'
    },
    {
      id: '2',
      change_type: 'amendment_proposed',
      description: 'Amendment A1 proposed by Sen. Smith',
      significance: 'major',
      detected_at: '2025-03-10T14:30:00Z',
      session_date: '2025-03-10'
    }
  ]

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return '📊'
      case 'amendment_proposed':
        return '📝'
      case 'amendment_adopted':
        return '✅'
      case 'hearing_scheduled':
        return '🗓️'
      case 'vote_taken':
        return '🗳️'
      default:
        return '📌'
    }
  }

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'major':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-[#002868] mb-6">Bill History</h2>
      
      {mockChanges.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No changes recorded yet</p>
      ) : (
        <div className="space-y-4">
          {mockChanges.map((change, index) => (
            <div
              key={change.id}
              className="relative pl-8 pb-8 last:pb-0"
            >
              {/* Timeline line */}
              {index < mockChanges.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />
              )}
              
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#002868] text-white flex items-center justify-center text-lg">
                {getChangeIcon(change.change_type)}
              </div>
              
              {/* Change content */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{change.description}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {formatDate(change.detected_at)}
                    </p>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSignificanceColor(change.significance)}`}>
                    {change.significance}
                  </span>
                </div>
                
                {change.session_date && (
                  <p className="text-sm text-slate-500 mt-2">
                    Session Date: {new Date(change.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}