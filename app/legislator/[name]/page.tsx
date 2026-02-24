import { getSupabaseServer } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LegislatorProfile from '../../components/LegislatorProfile'
import LegislatorBills from '../../components/LegislatorBills'

export default async function LegislatorPage({ params }: { params: Promise<{ name: string }> }) {
  const supabase = getSupabaseServer()
  const resolvedParams = await params
  const legislatorName = decodeURIComponent(resolvedParams.name)

  // Fetch bills and legislator record in parallel
  const [{ data: bills, error }, { data: legislatorRows }] = await Promise.all([
    supabase
      .from('Bills')
      .select('id, bill_number, title, status, last_action, last_action_date, body, subjects, next_event')
      .ilike('author', legislatorName)
      .order('bill_number', { ascending: true }),
    supabase
      .from('legislators')
      .select('name, chamber, party, district_number, photo_url, committees, caucuses, parishes_represented, year_elected, term_end')
      .ilike('name', legislatorName)
      .limit(1),
  ])

  if (error || !bills || bills.length === 0) {
    notFound()
  }

  const legislator = legislatorRows?.[0] ?? null

  // Derive legislative focus topics from bill subjects
  const topicSet = new Set<string>()
  bills.forEach(bill => {
    if (Array.isArray(bill.subjects)) {
      bill.subjects.forEach((s: any) => { if (s.subject_name) topicSet.add(s.subject_name) })
    }
  })
  const topics = Array.from(topicSet).slice(0, 6)

  const activeBills   = bills.filter(b => b.status !== 'Dead' && b.status !== 'Failed').length
  const houseBills    = bills.filter(b => b.body === 'H' || b.body === 'House').length
  const senateBills   = bills.filter(b => b.body === 'S' || b.body === 'Senate').length

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link
            href="/legislators"
            className="inline-flex items-center gap-2 text-[#C4922A] hover:underline mb-6 font-medium text-sm uppercase tracking-wider"
          >
            ← All Legislators
          </Link>

          <LegislatorProfile
            legislator={legislator}
            legislatorName={legislatorName}
            billCount={bills.length}
          />

          {/* Legislative Focus */}
          {topics.length > 0 && (
            <div className="mt-10 bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-[#0C2340] mb-6">Legislative Focus — 2026 Session</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Policy Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-[#0C2340] text-sm font-medium rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Session Activity</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Bills filed</dt>
                      <dd className="font-semibold text-[#0C2340]">{bills.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Active bills</dt>
                      <dd className="font-semibold text-[#0C2340]">{activeBills}</dd>
                    </div>
                    {houseBills > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">House bills</dt>
                        <dd className="font-semibold text-[#0C2340]">{houseBills}</dd>
                      </div>
                    )}
                    {senateBills > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Senate bills</dt>
                        <dd className="font-semibold text-[#0C2340]">{senateBills}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Bills list */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-[#0C2340] mb-6">
              Bills Filed — 2026 Regular Session ({bills.length})
            </h2>
            <LegislatorBills bills={bills} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
