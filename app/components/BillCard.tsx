import Link from 'next/link'

interface BillCardProps {
  bill: {
    id: number
    bill_number: string
    title: string
    description?: string
    author?: string
    status?: string
    summary?: string
    subjects?: { subject_name: string }[]
    last_action?: string
  }
}

export default function BillCard({ bill }: BillCardProps) {
  const billType = bill.bill_number?.replace(/[^A-Z]/g, '') || 'B'
  
  return (
    <Link href={`/bill/${bill.id}`}>
      <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#002868]/30 transition-all duration-200 h-full">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002868] to-[#003d99] flex items-center justify-center text-white font-bold text-sm shadow-md">
              {billType}
            </div>
            <div>
              <h3 className="font-bold text-[#002868] group-hover:text-[#003d99] transition-colors">
                {bill.bill_number}
              </h3>
              <p className="text-sm text-slate-500">by {bill.author || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#f4c430] group-hover:text-[#002868] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        <h4 className="font-medium text-slate-900 mb-2 line-clamp-2">
          {bill.title}
        </h4>
        
        {bill.summary && (
          <div className="mb-3 pl-3 border-l-2 border-[#f4c430]">
            <p className="text-sm text-slate-600 line-clamp-2">
              {bill.summary.replace(/^##\s*/gm, '').replace(/\*\*/g, '').substring(0, 150)}...
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="line-clamp-1">{bill.last_action || bill.status || 'Prefiled'}</span>
        </div>
      </div>
    </Link>
  )
}
