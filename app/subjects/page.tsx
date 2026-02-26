import TopBar from '@/app/components/TopBar'
import Footer from '@/app/components/Footer'
import SubjectHeatmap from '@/app/components/SubjectHeatmap'

export const revalidate = 3600

export default function SubjectsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
      <TopBar />

      <main style={{ flex: 1, padding: '40px 0 60px' }}>
        <div style={{ maxWidth: 'var(--width-wide)', margin: '0 auto', padding: '0 24px' }}>

          {/* Page header */}
          <div style={{
            background: 'var(--navy)',
            borderRadius: '16px',
            padding: '40px 48px',
            marginBottom: '40px',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              2026 Regular Session
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '40px',
              fontWeight: 700,
              color: 'var(--white)',
              lineHeight: 1.1,
              marginBottom: '12px',
            }}>
              Browse by Subject
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.65)',
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: '560px',
            }}>
              Explore policy areas tracked in the 2026 Louisiana Regular Session. Click any subject to see related bills.
            </p>
          </div>

          {/* Heatmap — full width, non-compact */}
          <SubjectHeatmap compact={false} />

        </div>
      </main>

      <Footer />
    </div>
  )
}
