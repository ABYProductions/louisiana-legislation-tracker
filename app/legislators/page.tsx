import { getSupabaseServer } from '@/lib/supabase'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const revalidate = 3600  // refresh hourly

type Chamber = 'all' | 'house' | 'senate'

function Monogram({ name, size = 44 }: { name: string; size?: number }) {
  const parts = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/)
  const mono = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0]?.slice(0, 2).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: size * 0.36, lineHeight: 1 }}>{mono}</span>
    </div>
  )
}

export default async function LegislatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ chamber?: string }>
}) {
  const supabase = getSupabaseServer()
  const { chamber: chamberParam } = await searchParams
  const activeTab: Chamber = chamberParam === 'house' ? 'house' : chamberParam === 'senate' ? 'senate' : 'all'

  // Fetch all legislators and bill-author counts in parallel
  const [{ data: legislators }, { data: billRows }] = await Promise.all([
    supabase
      .from('legislators')
      .select('name, chamber, party, district_number, photo_url')
      .order('chamber', { ascending: true })
      .order('district_number', { ascending: true, nullsFirst: false }),
    supabase
      .from('Bills')
      .select('author'),
  ])

  // Build bill count map
  const billCountMap = new Map<string, number>()
  for (const b of billRows ?? []) {
    if (b.author) billCountMap.set(b.author, (billCountMap.get(b.author) ?? 0) + 1)
  }

  const allLegislators = legislators ?? []
  const filtered = activeTab === 'all'
    ? allLegislators
    : allLegislators.filter(l => l.chamber === activeTab)

  const houseCount  = allLegislators.filter(l => l.chamber === 'house').length
  const senateCount = allLegislators.filter(l => l.chamber === 'senate').length
  const totalBills  = Array.from(billCountMap.values()).reduce((s, n) => s + n, 0)

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    background: active ? 'var(--navy)' : 'transparent',
    color: active ? 'var(--white)' : 'var(--navy)',
    border: `2px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
    textDecoration: 'none',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4" style={{ maxWidth: 'var(--width-wide)' }}>

          {/* Page header */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:underline mb-4 font-medium text-sm uppercase tracking-wider" style={{ color: 'var(--gold)' }}
            >
              ← All Bills
            </Link>

            <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: 'var(--navy)', color: 'var(--white)' }}>
              <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                Louisiana Legislators
              </h1>
              <p className="text-blue-200 text-base mb-6">2026 Regular Session</p>
              <div className="flex flex-wrap gap-8 text-sm">
                <div>
                  <span className="font-bold text-2xl" style={{ color: 'var(--gold)' }}>{houseCount}</span>
                  <span className="text-blue-200 ml-2">House members</span>
                </div>
                <div>
                  <span className="font-bold text-2xl" style={{ color: 'var(--gold)' }}>{senateCount}</span>
                  <span className="text-blue-200 ml-2">Senators</span>
                </div>
                <div>
                  <span className="font-bold text-2xl" style={{ color: 'var(--gold)' }}>{totalBills}</span>
                  <span className="text-blue-200 ml-2">bills filed</span>
                </div>
              </div>
            </div>

            {/* Chamber tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/legislators" style={tabStyle(activeTab === 'all')}>
                All ({allLegislators.length})
              </Link>
              <Link href="/legislators?chamber=house" style={tabStyle(activeTab === 'house')}>
                House ({houseCount})
              </Link>
              <Link href="/legislators?chamber=senate" style={tabStyle(activeTab === 'senate')}>
                Senate ({senateCount})
              </Link>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              No legislators found.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((leg) => {
                const billCount = billCountMap.get(leg.name) ?? 0
                const partyColor = leg.party === 'Republican' ? '#DC2626'
                  : leg.party === 'Democrat' ? '#2563EB'
                  : '#6B7280'

                return (
                  <Link
                    key={`${leg.chamber}-${leg.district_number}`}
                    href={`/legislator/${encodeURIComponent(leg.name)}`}
                    className="group block bg-white rounded-xl border border-[var(--border)] hover:border-[var(--navy)] hover:shadow-md transition-all p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Photo or monogram */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {leg.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leg.photo_url}
                            alt={leg.name}
                            style={{
                              width: 48, height: 48,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid var(--border)',
                            }}
                          />
                        ) : (
                          <Monogram name={leg.name} size={48} />
                        )}
                        {/* Party dot */}
                        {leg.party && (
                          <span style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 12, height: 12,
                            borderRadius: '50%',
                            background: partyColor,
                            border: '2px solid var(--white)',
                          }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold transition-colors text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                            {leg.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {leg.district_number != null && (
                            <span className="text-xs text-slate-500">
                              {leg.chamber === 'house' ? 'H' : 'S'}-{leg.district_number}
                            </span>
                          )}
                          {leg.party && (
                            <span style={{ color: partyColor }} className="text-xs font-semibold">
                              {leg.party === 'Republican' ? 'R' : leg.party === 'Democrat' ? 'D' : leg.party[0]}
                            </span>
                          )}
                          {billCount > 0 && (
                            <span className="text-xs text-slate-400">
                              · {billCount} {billCount === 1 ? 'bill' : 'bills'}
                            </span>
                          )}
                        </div>
                      </div>

                      <svg className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
