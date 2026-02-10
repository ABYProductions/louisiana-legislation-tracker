import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillTimeline from '@/app/components/BillTimeline'
import BillChangeHistory from '@/app/components/BillChangeHistory'
import AmendmentSummary from '@/app/components/AmendmentSummary'
import TextComparison from '@/app/components/TextComparison'

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

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const { data: bill, error } = await supabase
    .from('Bills')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !bill) {
    notFound()
  }

  const typedBill = bill as Bill

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-[#002868] text-white rounded-full text-sm font-semibold">
                    {typedBill.bill_number}
                  </span>
                  <span className="px-3 py-1 bg-[#f4c430] text-[#002868] rounded-full text-sm font-semibold">
                    {typedBill.body}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 mb-4">
                  {typedBill.title}
                </h1>
                
                {typedBill.description && (
                  <p className="text-slate-700 text-lg leading-relaxed mb-4">
                    {typedBill.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                 <div className="flex items-center gap-2">
                   <span className="font-semibold text-slate-900">Sponsor:</span>
                    <Link 
                      href={`/legislator/${encodeURIComponent(typedBill.author)}`}
                      className="text-[#002868] hover:text-[#001a4d] underline font-medium transition-colors"
                    > 
                      {typedBill.author}
                    </Link>
                </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Status:</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">{typedBill.status}</span>
                  </div>
                  {typedBill.last_action_date && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Last Action:</span>
                      <span className="text-slate-700">
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
                <a href={'https://legiscan.com/LA/bill/' + typedBill.bill_number}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#002868] text-white rounded-lg hover:bg-[#001a4d] transition-colors text-center text-sm font-semibold shadow-sm"
                >
                  View on LegiScan
                </a>
                <button className="px-4 py-2 border-2 border-[#002868] text-[#002868] rounded-lg hover:bg-[#002868] hover:text-white transition-all text-sm font-semibold">
                  Share Bill
                </button>
              </div>
            </div>

            {typedBill.summary && (
              <div className="bg-slate-50 border-2 border-[#002868] rounded-xl p-6 shadow-inner">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl" role="img" aria-label="AI summary">🤖</span>
                  <h2 className="text-lg font-bold text-[#002868] tracking-tight">AI Summary</h2>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {typedBill.summary}
                </p>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
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
            </div>

            <div className="lg:col-span-2 space-y-6">
              <AmendmentSummary billId={typedBill.id} />
              <BillChangeHistory billId={typedBill.id} />
              <TextComparison
                beforeText="Section 3. The department shall establish procedures for processing applications."
                afterText="Section 3. The department must establish comprehensive procedures and guidelines."
                sectionTitle="Section 3 Changes"
              />

              {typedBill.last_action && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Latest Action</h2>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" role="img" aria-label="pin">📌</span>
                    <div className="flex-1">
                      <p className="text-slate-700 leading-relaxed mb-2 font-medium">
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
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}