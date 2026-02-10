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
          {/* Main Bill Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-[#002868] text-white rounded-full text-sm font-bold">
                    {typedBill.bill_number}
                  </span>
                  <span className="px-3 py-1 bg-[#f4c430] text-[#002868] rounded-full text-sm font-bold">
                    {typedBill.body}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 mb-4">
                  {typedBill.title}
                </h1>
                
                {typedBill.description && (
                  <p className="text-slate-600 text-lg leading-relaxed mb-4">
                    {typedBill.description}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Author</p>
                    <Link 
                      href={`/legislator/${encodeURIComponent(typedBill.author)}`}
                      className="text-[#002868] hover:underline font-bold text-sm"
                    > 
                      {typedBill.author}
                    </Link>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Action</p>
                    <p className="text-sm text-slate-900 font-bold">
                      {typedBill.last_action_date ? new Date(typedBill.last_action_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-sm text-slate-900 font-bold">{typedBill.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chamber</p>
                    <p className="text-sm text-slate-900 font-bold">{typedBill.body}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <a href={'https://legiscan.com/LA/bill/' + typedBill.bill_number}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#002868] text-white rounded-xl hover:bg-[#001a4d] transition-all text-center text-sm font-bold shadow-md"
                >
                  View Official Document →
                </a>
                <button className="px-6 py-3 border-2 border-[#002868] text-[#002868] rounded-xl hover:bg-[#002868] hover:text-white transition-all text-sm font-bold">
                  Share Bill
                </button>
              </div>
            </div>

            {/* AI Summary Box */}
            {typedBill.summary && (
              <div className="bg-slate-50 border-2 border-[#002868] rounded-2xl p-6 shadow-sm mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl" role="img" aria-label="AI summary">🤖</span>
                  <h2 className="text-xl font-bold text-[#002868]">AI Summary</h2>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                  {typedBill.summary}
                </div>
              </div>
            )}
          </div>

          {/* Secondary Information Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="sticky top-8">
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
            </div>

            <div className="lg:col-span-2 space-y-8">
              <AmendmentSummary billId={typedBill.id} />
              <BillChangeHistory billId={typedBill.id} />
              <TextComparison
                beforeText="Section 3. The department shall establish procedures for processing applications."
                afterText="Section 3. The department must establish comprehensive procedures and guidelines."
                sectionTitle="Section 3 Changes"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}