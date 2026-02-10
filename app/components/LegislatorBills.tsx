import Link from 'next/link'

interface Bill {
  id: number
  bill_number: string
  title: string
  status: string
  last_action_date: string
  body: string
}

export default function LegislatorBills({ bills }: { bills: Bill[] }) {
  return (
    <div className="grid gap-4">
      {bills.map((bill) => (
        <Link
          key={bill.id}
          href={`/bill/${bill.id}`}
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-[#002868] hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-[#002868] text-white rounded-full text-sm font-semibold">
                  {bill.bill_number}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                  {bill.body}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  bill.status === 'Dead' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {bill.status}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {bill.title}
              </h3>
              
              {bill.last_action_date && (
                <p className="text-sm text-slate-500">
                  Last Action: {new Date(bill.last_action_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            <div className="flex-shrink-0">
              <span className="inline-flex items-center text-[#002868] font-medium">
                View Details →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}