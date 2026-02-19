import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export default function AboutPage() {
  return (
    <>
      <Header />
      <main style={{ background: '#F7F4EF', minHeight: '100vh' }}>

        {/* Page header */}
        <div style={{
          background: '#F7F4EF',
          borderBottom: '1px solid #DDD8CE',
          padding: '56px 48px 48px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            fontStyle: 'italic',
            fontWeight: 300,
            color: '#C4922A',
            letterSpacing: '0.15em',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ width: '28px', height: '1px', background: '#C4922A', opacity: 0.55, display: 'inline-block' }} />
            SessionSource
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '56px',
            fontWeight: 700,
            color: '#0C2340',
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}>
            About
          </h1>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 48px' }}>

          {/* Section: What is this */}
          <section style={{ marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 700,
              color: '#0C2340',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #DDD8CE',
            }}>
              What is SessionSource?
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
              marginBottom: '16px',
            }}>
              SessionSource is an independent legislative tracking tool built to make the Louisiana State Legislature more accessible to every citizen of the Pelican State. We track bills as they are filed, amended, and voted upon — and provide AI-generated plain-English summaries to help you understand what each piece of legislation actually means.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
            }}>
              SessionSource is not affiliated with, endorsed by, or funded by the Louisiana Legislature or any government body. This is a civic technology project.
            </p>
          </section>

          {/* Section: Data */}
          <section style={{ marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 700,
              color: '#0C2340',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #DDD8CE',
            }}>
              Where does the data come from?
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
              marginBottom: '16px',
            }}>
              Bill data is sourced from LegiScan, a non-partisan legislative data service that aggregates information from official state legislature websites. Our system syncs with LegiScan regularly during the session to keep bill information, statuses, and histories current.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
            }}>
              For official and authoritative information, always refer to the{' '}
              <a href="https://legis.la.gov" target="_blank" rel="noopener noreferrer"
                style={{ color: '#C4922A', textDecoration: 'none', borderBottom: '1px solid #C4922A' }}>
                Louisiana Legislature's official website
              </a>.
            </p>
          </section>

          {/* Section: AI */}
          <section style={{ marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 700,
              color: '#0C2340',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #DDD8CE',
            }}>
              About AI-Generated Content
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
              marginBottom: '16px',
            }}>
              Bill summaries on this site are generated using Claude, Anthropic's AI assistant. These summaries are intended to provide accessible plain-English overviews of complex legislation. They are not legal advice, legislative analysis, or official government communications.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.8,
              color: '#5a5248',
              fontWeight: 300,
            }}>
              AI-generated content may contain inaccuracies, omissions, or errors. Always review the full text of any bill before relying on a summary for legal, business, or civic purposes.
            </p>
          </section>

          {/* Disclaimer box */}
          <div style={{
            background: '#fff',
            border: '1px solid #DDD8CE',
            borderLeft: '4px solid #C4922A',
            padding: '24px 28px',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#C4922A',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              Legal Disclaimer
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              lineHeight: 1.75,
              color: '#5a5248',
              fontWeight: 300,
            }}>
              SessionSource — Louisiana provides information about Louisiana legislation using artificial intelligence and automated processes. By using this website, you acknowledge and agree to the terms of this disclaimer. This website is for informational and educational purposes only. All generated content may contain errors, omissions, or factual inaccuracies. SessionSource does not warrant, guarantee, or represent that any information provided on this website is accurate, complete, or reliable. This site does not provide legal, political, professional, official, government communication, or other professional advice.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
