// app/components/BillCard.tsx
import Link from 'next/link'

interface BillCardProps {
  bill: {
    id: number
    bill_number: string
    title: string
    description: string | null
    author: string | null
    status: string
    last_action: string | null
    last_action_date: string | null
  }
}

export default function BillCard({ bill }: BillCardProps) {
  // Get status color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('passed') || statusLower.includes('enacted')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (statusLower.includes('engrossed')) {
      return 'bg-blue-100 text-blue-800 border-blue-300'
    }
    if (statusLower.includes('committee')) {
      return 'bg-amber-100 text-amber-800 border-amber-300'
    }
    if (statusLower.includes('introduced')) {
      return 'bg-slate-100 text-slate-800 border-slate-300'
    }
    if (statusLower.includes('failed') || statusLower.includes('vetoed')) {
      return 'bg-red-100 text-red-800 border-red-300'
    }
    return 'bg-slate-100 text-slate-800 border-slate-300'
  }

  // Get chamber from bill number
  const getChamber = (billNumber: string) => {
    if (billNumber.startsWith('HB') || billNumber.startsWith('HR')) return 'House'
    if (billNumber.startsWith('SB') || billNumber.startsWith('SR')) return 'Senate'
    return 'Unknown'
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const chamber = getChamber(bill.bill_number)
  const statusColor = getStatusColor(bill.status)
  const formattedDate = formatDate(bill.last_action_date)

  return (
    <Link href={`/bill/${bill.id}`}>
      <div className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-[#002868] hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#002868] text-white text-sm font-bold px-3 py-1.5 rounded-lg">
              {bill.bill_number}
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
              {chamber}
            </div>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${statusColor}`}>
            {bill.status}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#002868] transition-colors line-clamp-2">
          {bill.title}
        </h3>

        {/* Description */}
        {bill.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {bill.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {bill.author && (
              <>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-slate-600 font-medium">{bill.author}</span>
              </>
            )}
          </div>
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formattedDate}
            </div>
          )}
        </div>

        {/* Last Action (if exists) */}
        {bill.last_action && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f4c430] mt-1.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 line-clamp-2">
                <span className="font-semibold text-slate-700">Latest: </span>
                {bill.last_action}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}