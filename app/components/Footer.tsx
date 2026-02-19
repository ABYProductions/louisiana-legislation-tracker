import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      background: '#0C2340',
      borderTop: '3px solid #C4922A',
      padding: '48px 48px 32px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '48px',
        marginBottom: '40px',
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            SessionSource
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#C4922A', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '16px' }}>
            Louisiana Legislature
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontWeight: 300 }}>
            Tracking legislation in the Louisiana State Legislature. AI-powered summaries for every citizen of the Pelican State.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 600, color: '#C4922A', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Navigation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { href: '/', label: 'Home' },
              { href: '/#bills', label: 'All Bills' },
              { href: '/legislators', label: 'Legislators' },
              { href: '/calendar', label: 'Calendar' },
              { href: '/about', label: 'About' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                letterSpacing: '0.03em',
              }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Session info */}
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 600, color: '#C4922A', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Session Info
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontWeight: 300 }}>
            <div>2026 Regular Session</div>
            <div>Opens: March 10, 2026</div>
            <div style={{ marginTop: '12px' }}>
              <a
                href="https://legis.la.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#C4922A', textDecoration: 'none', fontSize: '13px' }}
              >
                Official Legislature Website
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
          SessionSource is an independent, non-partisan tracking tool. Not affiliated with the Louisiana Legislature.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          2026 SessionSource
        </p>
      </div>
    </footer>
  )
}
