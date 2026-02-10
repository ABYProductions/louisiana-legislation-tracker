import Link from 'next/link'

interface BillCardProps {
  bill: {
    id: number
    bill_number: string
    title: string
    description: string
    status: string
    author: string
    body: string
    last_action_date: string
  }
}

export default function BillCard({ bill }: BillCardProps) {
  return (
    <Link
      href={`/bill/${bill.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#002868] hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[#002868] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {bill.bill_number.substring(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#002868] mb-1">
              {bill.bill_number}
            </h3>
            <p className="text-sm text-slate-600">{bill.body} • 2026 Regular Session</p>
          </div>
        </div>
        <span className="text-3xl">{bill.id}</span>
      </div>

      <p className="text-slate-900 font-medium mb-3 line-clamp-2">
        {bill.title}
      </p>

      {bill.description && (
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {bill.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Author</p>
          <p className="text-sm text-slate-900">{bill.author}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Last Action</p>
          <p className="text-sm text-slate-900">
            {bill.last_action_date
              ? new Date(bill.last_action_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Committee</p>
          <p className="text-sm text-slate-900">Civil Law and Procedure</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Chamber</p>
          <p className="text-sm text-slate-900">{bill.body.charAt(0)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <span className="inline-flex items-center px-4 py-2 bg-[#002868] text-white rounded-lg text-sm font-semibold hover:bg-[#001a4d] transition-colors">
          View Official Document →
        </span>
      </div>
    </Link>
  )
}