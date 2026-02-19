'use client'
import { useState, useEffect } from 'react'

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimer_accepted')
    if (!hasAccepted) setIsOpen(true)
  }, [])

  const handleAccept = () => {
    const acceptanceLog = {
      accepted: true,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }
    localStorage.setItem('disclaimer_accepted', JSON.stringify(acceptanceLog))
    setIsOpen(false)
  }

  if (!isOpen) return null

  const sectionHead: React.CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0C2340',
    marginTop: '28px',
    marginBottom: '10px',
  }

  const body: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    lineHeight: 1.8,
    color: '#5a5248',
    fontWeight: 300,
    margin: 0,
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(12,35,64,0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#F7F4EF',
        border: '1px solid #DDD8CE',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: '#0C2340',
          borderBottom: '3px solid #C4922A',
          padding: '28px 36px',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            fontWeight: 600,
            color: '#C4922A',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Important Notice
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            lineHeight: 1.1,
          }}>
            Legal Disclaimer
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 36px', flex: 1 }}>

          {/* AI notice callout */}
          <div style={{
            background: '#fff',
            borderLeft: '4px solid #C4922A',
            padding: '14px 18px',
            marginBottom: '4px',
          }}>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0C2340',
              margin: 0,
              letterSpacing: '0.02em',
            }}>
              AI-Generated Content Notice
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <p style={body}>
              <strong style={{ fontWeight: 600, color: '#0C2340' }}>PLEASE READ CAREFULLY:</strong> This website provides information about Louisiana legislation using artificial intelligence and automated processes. By using this website, you acknowledge and agree to the following:
            </p>

            <h3 style={sectionHead}>AI-Generated Content</h3>
            <p style={body}>
              All bill summaries, analyses, legislator profiles, and historical analyses on this website are generated using artificial intelligence (AI) technology, including but not limited to Claude AI by Anthropic. This content is computer-generated and has not been reviewed or verified by licensed attorneys, legislative experts, or government officials.
            </p>

            <h3 style={sectionHead}>No Warranty of Accuracy</h3>
            <p style={body}>
              SessionSource — Louisiana <strong style={{ fontWeight: 600 }}>does not warrant, guarantee, or represent</strong> that any information provided on this website is accurate, complete, current, or reliable. AI-generated content may contain errors, omissions, or misinterpretations of legislative text, legislative intent, or factual information.
            </p>

            <h3 style={sectionHead}>Not Legal, Political, or Professional Advice</h3>
            <p style={body}>
              Nothing on this website constitutes legal advice, political advice, professional consultation, or official government communication. This website is for <strong style={{ fontWeight: 600 }}>informational and educational purposes only</strong>. You should not rely on any information from this website for legal, political, financial, or business decisions.
            </p>

            <h3 style={sectionHead}>User Responsibility to Verify</h3>
            <p style={{ ...body, marginBottom: '10px' }}>
              <strong style={{ fontWeight: 600, color: '#0C2340' }}>YOU ARE SOLELY RESPONSIBLE</strong> for verifying any information obtained from this website before taking any action based on that information. For official, authoritative information about Louisiana legislation, please consult:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '0 0 0 0' }}>
              {[
                'The official Louisiana State Legislature website (legis.la.gov)',
                'Official legislative documents and session records',
                'A licensed attorney admitted to practice in Louisiana',
                'Appropriate government agencies and officials',
              ].map((item, i) => (
                <li key={i} style={{ ...body, marginBottom: '6px' }}>{item}</li>
              ))}
            </ul>

            <h3 style={sectionHead}>Limitation of Liability</h3>
            <p style={body}>
              To the maximum extent permitted by applicable law, SessionSource — Louisiana, its operators, developers, and affiliates shall not be liable for any damages, losses, or consequences arising from your use of this website or reliance on AI-generated content, including but not limited to direct, indirect, incidental, consequential, or punitive damages.
            </p>

            <h3 style={sectionHead}>Louisiana and Federal Law Compliance</h3>
            <p style={body}>
              This disclaimer complies with Louisiana consumer protection laws, federal AI disclosure requirements, and general principles of online content liability. The website operators make no representations about the suitability of this information for any specific purpose or jurisdiction.
            </p>

            {/* Acceptance checklist */}
            <div style={{
              background: '#fff',
              border: '1px solid #DDD8CE',
              borderLeft: '4px solid #0C2340',
              padding: '20px 24px',
              marginTop: '28px',
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0C2340',
                marginBottom: '12px',
              }}>
                By clicking I Accept below, you acknowledge that:
              </p>
              {[
                'You have read and understood this disclaimer',
                'You understand this website uses AI-generated content',
                'You agree to verify all information independently',
                'You will not rely on this website for legal or professional advice',
                'Your acceptance will be logged with a timestamp',
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: i < 4 ? '8px' : 0,
                }}>
                  <span style={{ color: '#C4922A', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#5a5248', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Accept button */}
        <div style={{
          borderTop: '1px solid #DDD8CE',
          padding: '24px 36px',
          background: '#fff',
          flexShrink: 0,
        }}>
          <button
            onClick={handleAccept}
            style={{
              width: '100%',
              background: '#0C2340',
              color: '#fff',
              padding: '16px',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            I Accept — Continue to Website
          </button>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: '#aaa',
            textAlign: 'center',
            marginTop: '12px',
            marginBottom: 0,
          }}>
            Your acceptance will be recorded locally in your browser
          </p>
        </div>
      </div>
    </div>
  )
}
