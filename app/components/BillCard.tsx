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
      className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {bill.bill_number.substring(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {bill.bill_number}
            </h3>
            <p className="text-xs text-slate-500">{bill.body}</p>
          </div>
        </div>
      </div>

      <h4 className="text-slate-900 font-semibold mb-2 line-clamp-2">
        {bill.title}
      </h4>

      {bill.description && (
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {bill.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{bill.author}</span>
        <span>
          {bill.last_action_date &&
            new Date(bill.last_action_date).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}