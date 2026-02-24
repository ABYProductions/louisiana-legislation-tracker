import { getSupabaseServer } from '@/lib/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillListWithFilters from '@/app/components/BillListWithFilters'
import UpcomingEventsWidget from '@/app/components/UpcomingEventsWidget'

async function getBills(search: string, chamber: string, legislator: string, status: string, subject: string) {
  const supabase = getSupabaseServer()

  let query = supabase
    .from('Bills')
    .select('id, bill_number, title, description, status, author, body, last_action_date, summary, summary_status, subjects')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,bill_number.ilike.%${search}%,author.ilike.%${search}%`)
  }
  if (chamber === 'House') {
    query = query.or('bill_number.ilike.HB%,bill_number.ilike.HR%')
  } else if (chamber === 'Senate') {
    query = query.or('bill_number.ilike.SB%,bill_number.ilike.SR%')
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
      <main style={{ minHeight: '100vh', background: '#F7F4EF' }}>

        {/* HERO */}
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
          <div>
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
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '44px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#C4922A',
              marginBottom: '28px',
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
                background: '#0C2340', color: '#fff', padding: '13px 30px',
                fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block',
              }}>Browse Bills</a>
              <a href="/calendar" style={{
                background: 'transparent', color: '#0C2340', padding: '13px 30px',
                fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                border: '1px solid #0C2340', display: 'inline-block',
              }}>View Calendar</a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #DDD8CE', padding: '28px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '64px', fontWeight: 700, color: '#0C2340', lineHeight: 1, marginBottom: '4px' }}>{totalCount}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bills Tracked</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #DDD8CE', padding: '26px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: '#0C2340', lineHeight: 1, marginBottom: '4px' }}>{authors.length}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Legislators</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #DDD8CE', padding: '26px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C4922A' }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 700, color: '#0C2340', lineHeight: 1, marginBottom: '4px' }}>{statuses.length}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bill Statuses</div>
            </div>
          </div>
        </section>

        {/* FEATURE STRIP */}
        <div style={{ background: '#0C2340', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
              <span style={{ fontSize: '18px', color: '#C4922A', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* UPCOMING EVENTS */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 48px 0' }}>
          <UpcomingEventsWidget />
        </section>

        {/* BILLS */}
        <section id="bills" style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 48px 64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: '#0C2340', marginBottom: '4px' }}>All Bills</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>
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