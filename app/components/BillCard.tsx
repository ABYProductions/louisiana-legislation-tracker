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
      className="block bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#002868] hover:shadow-xl transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#002868] flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-[#001a4d] transition-colors">
            <span className="text-white font-bold text-lg">
              {bill.bill_number.substring(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#002868] mb-0.5">
              {bill.bill_number}
            </h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {bill.body} • 2026 Regular Session
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
           <span className="text-xs font-bold text-slate-400">{bill.id}</span>
        </div>
      </div>

      <p className="text-slate-900 font-semibold mb-2 line-clamp-2 text-lg leading-tight">
        {bill.title}
      </p>

      {bill.description && (
        <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {bill.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Author</p>
          <p className="text-sm text-slate-800 font-medium truncate">{bill.author}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Last Action</p>
          <p className="text-sm text-slate-800 font-medium">
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Committee</p>
          <p className="text-sm text-slate-800 font-medium truncate">Civil Law and Procedure</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Chamber</p>
          <p className="text-sm text-slate-800 font-medium">{bill.body}</p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <span className="inline-flex items-center px-5 py-2.5 bg-[#002868] text-white rounded-lg text-sm font-bold group-hover:bg-[#001a4d] transition-all shadow-sm">
          View Official Document →
        </span>
      </div>
    </Link>
  )
}