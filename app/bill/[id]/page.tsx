import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillTimeline from '@/app/components/BillTimeline'
import BillScheduleTimeline from '@/app/components/BillScheduleTimeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Bill {
  id: number
  bill_id: number
  bill_number: string
  title: string
  description: string
  status: string
  author: string
  body: string
  summary: string
  last_action_date: string
  last_action: string
  created_at: string
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  const { data: bill, error } = await supabase
    .from('Bills')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !bill) {
    console.error('Error fetching bill:', error)
    notFound()
  }

  const typedBill = bill as Bill

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-[#0C2340] text-white rounded-full text-sm font-semibold">
                    {typedBill.bill_number}
                  </span>
                  <span className="px-3 py-1 bg-[#FDD023] text-[#0C2340] rounded-full text-sm font-semibold">
                    {typedBill.body}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-[#0C2340] mb-4">
                  {typedBill.title}
                </h1>
                
                {typedBill.description && (
                  <p className="text-slate-700 text-lg leading-relaxed mb-4">
                    {typedBill.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Sponsor:</span>
                    <Link 
                      href={`/legislator/${encodeURIComponent(typedBill.author)}`}
                      className="text-[#0C2340] hover:text-[#FDD023] hover:underline font-medium"
                    >
                      {typedBill.author}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">{typedBill.status}</span>
                  </div>
                  {typedBill.last_action_date && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Last Action:</span>
                      <span>
                        {new Date(typedBill.last_action_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full lg:w-auto">
                <a 
                  href={`https://legis.la.gov/legis/BillInfo.aspx?s=26RS&b=${typedBill.bill_number.replace(/\s+/g, '')}&sbi=y`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#0C2340] text-white rounded-lg hover:bg-[#152d4a] transition-colors text-center text-sm font-medium flex items-center justify-center gap-2"
                >
                  View on legis.la.gov
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <Link
                  href="/"
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-center"
                >
                  Back to All Bills
                </Link>
              </div>
            </div>

            {typedBill.summary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🤖</span>
                  <h2 className="text-lg font-bold text-[#0C2340]">AI-Generated Summary</h2>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {typedBill.summary}
                </div>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <BillTimeline 
                history={[
                  {
                    date: typedBill.created_at,
                    action: 'Bill Introduced',
                    chamber: typedBill.body,
                    chamber_id: 1,
                    importance: 3
                  },
                  {
                    date: typedBill.last_action_date || typedBill.created_at,
                    action: typedBill.last_action || typedBill.status,
                    chamber: typedBill.body,
                    chamber_id: 1,
                    importance: 2
                  }
                ]} 
              />

              {typedBill.last_action && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-[#0C2340] mb-4">Latest Action</h2>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-slate-700 leading-relaxed mb-2">
                        {typedBill.last_action}
                      </p>
                      {typedBill.last_action_date && (
                        <p className="text-sm text-slate-500">
                          {new Date(typedBill.last_action_date).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-[#0C2340] mb-4">Bill Information</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Bill ID:</span>
                    <span className="text-slate-900">{typedBill.bill_id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Chamber:</span>
                    <span className="text-slate-900">{typedBill.body}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Status:</span>
                    <span className="text-slate-900">{typedBill.status}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-slate-600">Introduced:</span>
                    <span className="text-slate-900">
                      {new Date(typedBill.created_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <BillScheduleTimeline billId={typedBill.id} billNumber={typedBill.bill_number} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}