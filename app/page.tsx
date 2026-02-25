import { getSupabaseServer } from '@/lib/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillListWithFilters from '@/app/components/BillListWithFilters'
import UpcomingEventsWidget from '@/app/components/UpcomingEventsWidget'

// Always fetch fresh data — bill status changes every few hours during session
export const revalidate = 0

async function getBills(search: string, chamber: string, legislator: string, status: string, subject: string) {
  const supabase = getSupabaseServer()

  let query = supabase
    .from('Bills')
    .select('id, bill_number, title, description, status, author, body, last_action_date, summary, summary_status, subjects, next_event')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,bill_number.ilike.%${search}%,author.ilike.%${search}%`)
  }
  if (chamber === 'House') {
    // Includes HB (House Bills), HR (House Resolutions), HCR (House Concurrent Resolutions)
    query = query.or('bill_number.ilike.HB%,bill_number.ilike.HR%,bill_number.ilike.HCR%')
  } else if (chamber === 'Senate') {
    // Includes SB (Senate Bills), SR (Senate Resolutions), SCR (Senate Concurrent Resolutions)
    query = query.or('bill_number.ilike.SB%,bill_number.ilike.SR%,bill_number.ilike.SCR%')
  }
  if (legislator) {
    query = query.eq('author', legislator)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching bills:', error)
    return []
  }

  let bills = data || []

  // Apply subject filter in application code to avoid any quirks
  // with Supabase's JSON containment operators across environments.
  if (subject) {
    const target = subject.toLowerCase()
    bills = bills.filter((bill: any) =>
      Array.isArray(bill.subjects) &&
      bill.subjects.some(
        (s: any) =>
          typeof s?.subject_name === 'string' &&
          s.subject_name.toLowerCase() === target
      )
    )
  }

  return bills
}

async function getAllMeta() {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('Bills')
    .select('author, status, subjects')
    .limit(2000)
  return data || []
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; chamber?: string; legislator?: string; status?: string; subject?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const chamber = params.chamber || ''
  const legislator = params.legislator || ''
  const status = params.status || ''
  const subject = params.subject || ''

  const [bills, allMeta] = await Promise.all([
    getBills(search, chamber, legislator, status, subject),
    getAllMeta(),
  ])

  const authors = [...new Set(allMeta.map((b: any) => b.author).filter(Boolean))].sort() as string[]
  const statuses = [...new Set(allMeta.map((b: any) => b.status).filter(Boolean))].sort() as string[]
  const subjects = [...new Set(
    allMeta
      .flatMap((b: any) => (Array.isArray(b.subjects) ? b.subjects : []))
      .map((s: any) => (typeof s?.subject_name === 'string' ? s.subject_name : null))
      .filter(Boolean)
  )].sort() as string[]
  const totalCount = allMeta.length

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
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1, marginBottom: '4px' }}>{authors.length}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Legislators</div>
            </div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', padding: '26px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1, marginBottom: '4px' }}>{statuses.length}</div>
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

        {/* BILLS */}
        <section id="bills" style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '40px 48px 64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>All Bills</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Browse and filter {totalCount} bills from the 2026 Regular Session
            </p>
          </div>
          <BillListWithFilters
            bills={bills}
            legislators={authors}
            statuses={statuses}
            subjects={subjects}
            totalCount={totalCount}
            currentSearch={search}
            currentChamber={chamber}
            currentLegislator={legislator}
            currentStatus={status}
            currentSubject={subject}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}