import { Suspense } from 'react'
import { getSupabaseServer } from '@/lib/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillSearch from '@/app/components/BillSearch'
import UpcomingEventsWidget from '@/app/components/UpcomingEventsWidget'
import type { SearchFilterState } from '@/app/components/SearchFilters'

// Always fetch fresh data — bill status changes every few hours during session
export const revalidate = 0

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  // Parse initial values from URL for SSR
  const initialQuery = (params.q as string) || ''
  const rawSubject = params.subject
  const rawBillType = params.bill_type

  const initialFilters: SearchFilterState = {
    chamber: (params.chamber as string) || '',
    status: (params.status as string) || '',
    committee: (params.committee as string) || '',
    sponsor: (params.sponsor as string) || '',
    subject: rawSubject
      ? Array.isArray(rawSubject)
        ? rawSubject
        : [rawSubject]
      : [],
    bill_type: rawBillType
      ? Array.isArray(rawBillType)
        ? rawBillType
        : [rawBillType]
      : [],
    has_event: (params.has_event as string) || '',
    date_from: (params.date_from as string) || '',
    date_to: (params.date_to as string) || '',
    sort: (params.sort as string) || 'date_desc',
  }

  // Get total count for hero stat card
  const supabase = getSupabaseServer()
  const { count } = await supabase
    .from('Bills')
    .select('*', { count: 'exact', head: true })
  const totalCount = count || 0

  // Get distinct authors count for legislator stat
  const { data: authorData } = await supabase
    .from('Bills')
    .select('author')
    .not('author', 'is', null)
    .limit(2000)
  const authorCount = new Set(
    (authorData || []).map((r: { author: string | null }) => r.author).filter(Boolean)
  ).size

  // Get distinct statuses count for stat card
  const { data: statusData } = await supabase
    .from('Bills')
    .select('status')
    .not('status', 'is', null)
    .limit(2000)
  const statusCount = new Set(
    (statusData || []).map((r: { status: string | null }) => r.status).filter(Boolean)
  ).size

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: 'var(--cream)' }}>

        {/* HERO */}
        <section className="hero-grid" style={{
          background: 'var(--cream)',
          padding: '72px 48px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          maxWidth: 'var(--width-wide)',
          margin: '0 auto',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: 300,
              color: 'var(--gold)',
              letterSpacing: '0.15em',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ width: '28px', height: '1px', background: 'var(--gold)', opacity: 0.55, display: 'inline-block' }} />
              Louisiana Legislature
              <span style={{ width: '28px', height: '1px', background: 'var(--gold)', opacity: 0.55, display: 'inline-block' }} />
            </div>
            <h1 className="hero-h1" style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '88px',
              fontWeight: 700,
              color: 'var(--navy)',
              lineHeight: 0.88,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              textShadow: '0.5px 0 0 var(--navy), -0.5px 0 0 var(--navy)',
            }}>
              Session<br />Source
            </h1>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '44px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--gold)',
              marginBottom: '28px',
            }}>
              Louisiana
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              lineHeight: 1.75,
              color: 'var(--text-secondary)',
              fontWeight: 300,
              marginBottom: '34px',
              maxWidth: '400px',
            }}>
              Your comprehensive guide to bills in the Louisiana State Legislature.
              AI-powered summaries make complex legislation accessible to every
              citizen of the Pelican State.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="#bills" className="btn btn-primary btn-lg">Browse Bills</a>
              <a href="/calendar" className="btn btn-secondary btn-lg">View Calendar</a>
            </div>
          </div>

          <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1', background: 'var(--white)', border: '1px solid var(--border)', padding: '28px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '64px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1, marginBottom: '4px' }}>{totalCount}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bills Tracked</div>
            </div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', padding: '26px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1, marginBottom: '4px' }}>{authorCount}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Legislators</div>
            </div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', padding: '26px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1, marginBottom: '4px' }}>{statusCount}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bill Statuses</div>
            </div>
          </div>
        </section>

        {/* FEATURE STRIP */}
        <div style={{ background: 'var(--navy)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }} className="feature-strip">
          {[
            { icon: '☰', title: 'All Bills', desc: 'Search and filter legislation' },
            { icon: '◉', title: 'AI Summaries', desc: 'Plain-English explanations' },
            { icon: '◎', title: 'Legislators', desc: 'Track your representatives' },
            { icon: '◷', title: 'Calendar', desc: 'Upcoming sessions and hearings' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <span style={{ fontSize: '18px', color: 'var(--gold)', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--white)', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* UPCOMING EVENTS */}
        <section style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '48px 48px 0' }}>
          <UpcomingEventsWidget />
        </section>

        {/* BILLS SEARCH */}
        <section id="bills" style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '40px 48px 64px' }}>
          <Suspense fallback={<div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-muted)', padding: '32px 0' }}>Loading search...</div>}>
            <BillSearch initialQuery={initialQuery} initialFilters={initialFilters} />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  )
}
