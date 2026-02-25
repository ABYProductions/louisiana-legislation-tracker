import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase'

async function getLastSyncTime(): Promise<string | null> {
  try {
    const supabase = getSupabaseServer()
    const { data } = await supabase
      .from('Bills')
      .select('last_action_date')
      .not('last_action_date', 'is', null)
      .order('last_action_date', { ascending: false })
      .limit(1)
      .single()
    if (data?.last_action_date) {
      return new Date(data.last_action_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    }
    return null
  } catch {
    return null
  }
}

export default async function Footer() {
  const lastSync = await getLastSyncTime()

  return (
    <footer style={{
      background: 'var(--navy)',
      borderTop: '3px solid var(--gold)',
      padding: '48px 48px 32px',
    }}>
      <div className="footer-grid" style={{
        maxWidth: 'var(--width-content)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '48px',
        marginBottom: '40px',
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--white)', marginBottom: '6px' }}>
            SessionSource
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '16px' }}>
            Louisiana Legislature
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontWeight: 300 }}>
            Tracking legislation in the Louisiana State Legislature. AI-powered summaries for every citizen of the Pelican State.
          </p>
          {lastSync && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.35)', marginTop: '12px' }}>
              Last synced: {lastSync}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>
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
                fontSize: 'var(--text-sm)',
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
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Session Info
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontWeight: 300 }}>
            <div>2026 Regular Session</div>
            <div>Opens: March 10, 2026</div>
            <div style={{ marginTop: '12px' }}>
              <a
                href="https://legis.la.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
              >
                Official Legislature Website
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 'var(--width-content)',
        margin: '0 auto',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
          SessionSource is an independent, non-partisan tracking tool. Not affiliated with the Louisiana Legislature.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.3)' }}>
          2026 SessionSource
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </footer>
  )
}
