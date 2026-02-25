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

  // Fetch legislators table record and bills in parallel
  const [{ data: legislatorRows }, { data: billsRaw }] = await Promise.all([
    supabase
      .from('legislators')
      .select('name, chamber, party, district_number, photo_url, committees, caucuses, parishes_represented, year_elected, term_end')
      .ilike('name', legislatorName)
      .limit(1),
    supabase
      .from('Bills')
      .select('id, bill_number, title, status, last_action, last_action_date, body, subjects, next_event')
      .ilike('author', legislatorName)
      .order('bill_number', { ascending: true }),
  ])

  const legislator = legislatorRows?.[0] ?? null
  const bills = billsRaw ?? []

  // 404 only if unknown to both the legislators table and Bills — handles pre-session
  // (most legislators have 0 bills until the session opens March 9)
  if (!legislator && bills.length === 0) {
    notFound()
  }

  // Derive policy topics from bill subjects
  const topicSet = new Set<string>()
  bills.forEach((bill: any) => {
    if (Array.isArray(bill.subjects)) {
      bill.subjects.forEach((s: any) => { if (s.subject_name) topicSet.add(s.subject_name) })
    }
  })
  const topics = Array.from(topicSet).slice(0, 6)

  const activeBills = bills.filter((b: any) => b.status !== 'Dead' && b.status !== 'Failed').length
  const houseBills  = bills.filter((b: any) => b.body === 'H' || b.body === 'House').length
  const senateBills = bills.filter((b: any) => b.body === 'S' || b.body === 'Senate').length

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--cream)' }}>
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4" style={{ maxWidth: 'var(--width-wide)' }}>
          <Link
            href="/legislators"
            className="inline-flex items-center gap-2 hover:underline mb-6 font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--gold)' }}
          >
            ← All Legislators
          </Link>

          <LegislatorProfile
            legislator={legislator}
            legislatorName={legislatorName}
            billCount={bills.length}
          />

          {/* Legislative Focus — only shown once bills exist */}
          {topics.length > 0 && (
            <div className="mt-10 bg-white rounded-2xl border border-[var(--border)] p-8">
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--navy)' }}>Legislative Focus — 2026 Session</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Policy Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <span key={i} className="px-3 py-1 text-sm font-medium rounded-full" style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
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
                      <dd className="font-semibold" style={{ color: 'var(--navy)' }}>{bills.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Active bills</dt>
                      <dd className="font-semibold" style={{ color: 'var(--navy)' }}>{activeBills}</dd>
                    </div>
                    {houseBills > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">House bills</dt>
                        <dd className="font-semibold" style={{ color: 'var(--navy)' }}>{houseBills}</dd>
                      </div>
                    )}
                    {senateBills > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Senate bills</dt>
                        <dd className="font-semibold" style={{ color: 'var(--navy)' }}>{senateBills}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Bills list — shown only when bills exist */}
          {bills.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--navy)' }}>
                Bills Filed — 2026 Regular Session ({bills.length})
              </h2>
              <LegislatorBills bills={bills} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
