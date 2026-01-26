import Link from 'next/link'

interface BillCardProps {
  bill: {
    id: string
    bill_number: string
    title: string
    summary?: string
    author?: string
    status?: string
    last_action?: string
    last_action_date?: string
    subjects?: Array<{ subject_name: string }>
  }
}

export default function BillCard({ bill }: BillCardProps) {
  const getStatusStyle = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'passed':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
      case 'failed':
        return 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
      case 'prefiled':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
      case 'introduced':
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
      default:
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20'
    }
  }

  return (
    <Link href={`/bill/${bill.id}`} className="group block">
      <article className="relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 font-bold text-sm ring-1 ring-indigo-100">
              {bill.bill_number.replace(/[^A-Z]/g, '')}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {bill.bill_number}
              </h2>
              {bill.author && (
                <p className="text-sm text-slate-500">by {bill.author}</p>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(bill.status)}`}>
            {bill.status || 'Unknown'}
          </span>
        </div>

        <h3 className="text-slate-700 font-medium mb-3 line-clamp-2 leading-relaxed">
          {bill.title}
        </h3>

        {bill.summary && (
          <div className="relative mb-4">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full" />
            <p className="text-sm text-slate-600 line-clamp-2 pl-2">
              {bill.summary}
            </p>
          </div>
        )}

        {bill.last_action && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">{bill.last_action}</span>
          </div>
        )}

        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </article>
    </Link>
  )
}
