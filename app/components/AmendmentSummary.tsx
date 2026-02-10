'use client'

import { useState } from 'react'

interface Amendment {
  id: string
  amendment_number: string
  title: string
  sponsor: string
  date_introduced: string
  status: 'proposed' | 'adopted' | 'rejected' | 'withdrawn'
  ai_summary: string
  amendment_type: string
  sections_affected: string[]
}

interface AmendmentSummaryProps {
  billId: number
}

export default function AmendmentSummary({ billId }: AmendmentSummaryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Mock data - replace with actual database fetch
  const mockAmendments: Amendment[] = [
    {
      id: '1',
      amendment_number: 'A1',
      title: 'Technical corrections to Section 3',
      sponsor: 'Sen. John Smith',
      date_introduced: '2025-03-10',
      status: 'adopted',
      ai_summary: 'This amendment makes technical corrections to clarify the effective date and removes outdated references to previous legislation.',
      amendment_type: 'technical',
      sections_affected: ['Section 3', 'Section 5']
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'adopted':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'proposed':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'substantive':
        return '📋'
      case 'technical':
        return '🔧'
      case 'clarifying':
        return '💡'
      case 'fiscal':
        return '💰'
      default:
        return '📝'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#002868]">Amendments</h2>
        <span className="px-3 py-1 bg-[#f4c430] text-[#002868] rounded-full text-sm font-semibold">
          {mockAmendments.length} Total
        </span>
      </div>

      {mockAmendments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">No amendments yet</p>
          <p className="text-slate-400 text-sm mt-2">
            Amendments will appear here when proposed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockAmendments.map((amendment) => (
            <div
              key={amendment.id}
              className="border border-slate-200 rounded-xl p-4 hover:border-[#002868] transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(amendment.amendment_type)}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900">
                      Amendment {amendment.amendment_number}
                    </h3>
                    <p className="text-slate-700 mt-1">{amendment.title}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Sponsored by {amendment.sponsor} • {new Date(amendment.date_introduced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(amendment.status)}`}>
                  {amendment.status.charAt(0).toUpperCase() + amendment.status.slice(1)}
                </span>
              </div>

              {/* AI Summary */}
              {amendment.ai_summary && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <span className="font-semibold text-[#002868]">AI Summary</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {amendment.ai_summary}
                  </p>
                </div>
              )}

              {/* Sections Affected */}
              {amendment.sections_affected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-sm text-slate-600">Affects:</span>
                  {amendment.sections_affected.map((section, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand/Collapse for more details */}
              <button
                onClick={() => setExpandedId(expandedId === amendment.id ? null : amendment.id)}
                className="mt-3 text-[#002868] hover:text-[#001a4d] text-sm font-medium flex items-center gap-1"
              >
                {expandedId === amendment.id ? '▼' : '▶'} 
                {expandedId === amendment.id ? 'Show Less' : 'View Full Details'}
              </button>

              {/* Expanded Details */}
              {expandedId === amendment.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Amendment Type</h4>
                    <p className="text-slate-700 text-sm capitalize">{amendment.amendment_type}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Full Analysis</h4>
                    <p className="text-slate-600 text-sm italic">
                      Detailed legal analysis will appear here when PDF parsing is enabled
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}