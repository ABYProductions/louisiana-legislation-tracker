import { createClient } from '@supabase/supabase-js'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillListWithFilters from '@/app/components/BillListWithFilters'
import UpcomingEventsWidget from '@/app/components/UpcomingEventsWidget'

async function getBills() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('Bills')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bills:', JSON.stringify(error, null, 2))
    return []
  }

  return data || []
}

export default async function Home() {
  const bills = await getBills()

  const subjects = [...new Set(
    bills
      .flatMap(b => b.subjects || [])
      .map((s: any) => s.subject_name)
      .filter(Boolean)
  )].sort()

  const authors = [...new Set(
    bills.map(b => b.author).filter(Boolean)
  )].sort()

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#F7F4EF' }}>

        {/* ── HERO ── */}
        <section style={{
          background: '#F7F4EF',
          padding: '72px 48px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
          borderBottom: '1px solid #DDD8CE',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>

          {/* Left: headline + CTA */}
          <div>
            {/* Ornament */}
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#C4922A',
              letterSpacing: '0.15em',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ width: '28px', height: '1px', background: '#C4922A', opacity: 0.55, display: 'inline-block' }} />
              Louisiana Legislature
              <span style={{ width: '28px', height: '1px', background: '#C4922A', opacity: 0.55, display: 'inline-block' }} />
            </div>

            {/* Main headline */}
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '88px',
              fontWeight: 700,
              color: '#0C2340',
              lineHeight: 0.88,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              textShadow: '0.5px 0 0 #0C2340, -0.5px 0 0 #0C2340',
            }}>
              Session<br />Source
            </h1>

            {/* Sub */}
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '44px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#C4922A',
              marginBottom: '28px',
              letterSpacing: '0.01em',
            }}>
              Louisiana
            </div>

            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              lineHeight: 1.75,
              color: '#5a5248',
              fontWeight: 300,
              marginBottom: '34px',
              maxWidth: '400px',
            }}>
              Your comprehensive guide to bills in the Louisiana State Legislature.
              AI-powered summaries make complex legislation accessible to every
              citizen of the Pelican State.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="#bills" style={{
                background: '#0C2340',
                color: '#fff',
                padding: '13px 30px',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                display: 'inline-block',
              }}>
                Browse Bills
              </a>
              <a href="/calendar" style={{
                background: 'transparent',
                color: '#0C2340',
                padding: '13px 30px',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                border: '1px solid #0C2340',
                display: 'inline-block',
              }}>
                View Calendar
              </a>
            </div>
          </div>

          {/* Right: 3 stat cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}>
            {/* Bills Tracked — full width */}
            <div style={{
              gridColumn: '1 / -1',
              background: '#fff',
              border: '1px solid #DDD8CE',
              padding: '28px 28px',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '64px',
                fontWeight: 700,
                color: '#0C2340',
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {bills.length}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Bills Tracked
              </div>
            </div>

            {/* Legislators */}
            <div style={{
              background: '#fff',
              border: '1px solid #DDD8CE',
              padding: '26px 22px',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '52px',
                fontWeight: 700,
                color: '#0C2340',
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {authors.length}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Legislators
              </div>
            </div>

            {/* Subject Areas */}
            <div style={{
              background: '#fff',
              border: '1px solid #DDD8CE',
              padding: '26px 22px',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '52px',
                fontWeight: 700,
                color: '#0C2340',
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {subjects.length}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Subject Areas
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE STRIP ── */}
        <div style={{
          background: '#0C2340',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { icon: '☰', title: 'All Bills', desc: 'Search and filter legislation' },
            { icon: '◉', title: 'AI Summaries', desc: 'Plain-English explanations' },
            { icon: '◎', title: 'Legislators', desc: 'Track your representatives' },
            { icon: '◷', title: 'Calendar', desc: 'Upcoming sessions and hearings' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <span style={{ fontSize: '18px', color: '#C4922A', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── UPCOMING EVENTS ── */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 48px 0' }}>
          <UpcomingEventsWidget />
        </section>

        {/* ── BILLS ── */}
        <section id="bills" style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 48px 64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              fontWeight: 700,
              color: '#0C2340',
              marginBottom: '4px',
            }}>
              All Bills
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>
              Browse and filter {bills.length} bills from the 2026 Regular Session
            </p>
          </div>

          <BillListWithFilters
            initialBills={bills}
            legislators={authors}
            subjects={subjects}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
