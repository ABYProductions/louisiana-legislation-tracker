'use client'
import { useState, useEffect, useRef } from 'react'

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimer_accepted')
    if (!hasAccepted) setIsOpen(true)
  }, [])

  // Focus trap + Escape to close
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    // Focus the first focusable element on open
    const firstFocusable = modal.querySelector<HTMLElement>(focusableSelectors)
    firstFocusable?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape does not dismiss — user must actively accept the disclaimer
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelectors))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

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
    color: 'var(--navy)',
    marginTop: '28px',
    marginBottom: '10px',
  }

  const body: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    lineHeight: 1.8,
    color: 'var(--text-secondary)',
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
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          background: 'var(--cream)',
          border: '1px solid var(--border)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* Header */}
        <div style={{
          background: 'var(--navy)',
          borderBottom: '3px solid var(--gold)',
          padding: '28px 36px',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Important Notice
          </div>
          <h2 id="modal-title" style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 700,
            color: 'var(--white)',
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
            background: 'var(--white)',
            borderLeft: '4px solid var(--gold)',
            padding: '14px 18px',
            marginBottom: '4px',
          }}>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--navy)',
              margin: 0,
              letterSpacing: '0.02em',
            }}>
              AI-Generated Content Notice
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <p style={body}>
              <strong style={{ fontWeight: 600, color: 'var(--navy)' }}>PLEASE READ CAREFULLY:</strong> This website provides information about Louisiana legislation using artificial intelligence and automated processes. By using this website, you acknowledge and agree to the following:
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
              <strong style={{ fontWeight: 600, color: 'var(--navy)' }}>YOU ARE SOLELY RESPONSIBLE</strong> for verifying any information obtained from this website before taking any action based on that information. For official, authoritative information about Louisiana legislation, please consult:
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
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--navy)',
              padding: '20px 24px',
              marginTop: '28px',
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--navy)',
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
                  <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Accept button */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 36px',
          background: 'var(--white)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleAccept}
            style={{
              width: '100%',
              background: 'var(--navy)',
              color: 'var(--white)',
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
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
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
