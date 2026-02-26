'use client'

import { useEffect, useRef } from 'react'

interface BetaDisclaimerModalProps {
  onClose: () => void
  bannerRef?: React.RefObject<HTMLDivElement | null>
}

export default function BetaDisclaimerModal({ onClose, bannerRef }: BetaDisclaimerModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Focus the close button on open; ESC to close; focus trap
  useEffect(() => {
    closeButtonRef.current?.focus()

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        bannerRef?.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelectors))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, bannerRef])

  const handleClose = () => {
    onClose()
    bannerRef?.current?.focus()
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--gold)',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid var(--border)',
  }

  const bodyText: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    lineHeight: 1.65,
    margin: 0,
  }

  const betaBadge: React.CSSProperties = {
    background: 'var(--gold)',
    color: 'var(--navy)',
    fontFamily: 'var(--font-sans)',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '2px 8px',
    borderRadius: '3px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(2px)',
        animation: 'betaOverlayIn 200ms ease forwards',
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
          animation: 'betaModalIn 220ms ease forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'var(--navy)',
          padding: '24px 28px 20px',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ ...betaBadge, display: 'inline-block', marginBottom: '8px' }}>BETA</div>
              <h2 id="disclaimer-title" style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '22px',
                fontWeight: 600,
                color: 'white',
                lineHeight: 1.2,
                margin: 0,
              }}>
                Beta Testing Disclaimer
              </h2>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '4px',
                marginBottom: 0,
              }}>
                Last updated: February 2026 · sessionsource.net
              </p>
            </div>
          </div>

          {/* Close × button */}
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            aria-label="Close disclaimer"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease',
              flexShrink: 0,
            }}
            className="beta-close-btn"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '28px 28px 32px' }}>

          {/* Section 1 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Beta Testing Status</div>
            <p style={bodyText}>
              SessionSource is currently in active beta development. This platform is being made available to select users for testing and feedback purposes prior to official launch. Features, data, and functionality may change without notice.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Data Accuracy &amp; Completeness</div>
            <p style={bodyText}>
              Legislative data displayed on this site is sourced from LegiScan and the Louisiana Legislature and is provided for informational purposes only. While we make reasonable efforts to ensure accuracy, SessionSource does not warrant that bill information, status updates, committee assignments, hearing schedules, or any other legislative data displayed on this site is complete, current, or error-free.
            </p>
            <p style={{ ...bodyText, marginTop: '12px' }}>
              AI-generated bill summaries are produced by automated systems and may contain errors, omissions, or mischaracterizations of legislative content. These summaries are not a substitute for reading the official bill text. Always consult the official Louisiana Legislature website at legis.la.gov for authoritative legislative information.
            </p>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Not Legal or Professional Advice</div>
            <p style={bodyText}>
              Nothing on this site constitutes legal advice, lobbying advice, political advice, or professional counsel of any kind. SessionSource is an informational tool only. Users should consult qualified legal counsel or other appropriate professionals for advice specific to their circumstances.
            </p>
            <p style={{ ...bodyText, marginTop: '12px' }}>
              SessionSource is not affiliated with the Louisiana Legislature, the State of Louisiana, or any government agency.
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Known Beta Limitations</div>
            <p style={bodyText}>During the beta period, users may experience the following:</p>
            <ul style={{ marginTop: '8px', paddingLeft: '16px', listStyle: 'disc' }}>
              {[
                'Bill summaries are not yet available for all tracked legislation',
                'Search functionality may return incomplete results',
                'Some features are still under active development and may be unavailable or unstable',
                'Historical data prior to the 2026 Regular Session may be limited',
                'The site may experience downtime during updates and deployments',
              ].map((item, i) => (
                <li key={i} style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '4px',
                }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Disclaimer of Warranties</div>
            <p style={bodyText}>
              SessionSource is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind, express or implied. ABY Productions and its principals expressly disclaim all warranties including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. Use of this site is at your own risk.
            </p>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionHead}>Limitation of Liability</div>
            <p style={bodyText}>
              To the maximum extent permitted by applicable law, ABY Productions and its principals shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this service, including reliance on any information obtained through SessionSource.
            </p>
          </div>

          {/* Section 7 */}
          <div>
            <div style={sectionHead}>Beta Feedback</div>
            <p style={bodyText}>
              We welcome feedback from beta users to help improve SessionSource before official launch. If you encounter errors, missing data, or have suggestions, please contact us.
            </p>
            <p style={{ ...bodyText, marginTop: '8px' }}>
              <a
                href="mailto:feedback@sessionsource.net"
                style={{
                  color: 'var(--gold)',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                feedback@sessionsource.net
              </a>
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 28px',
          background: 'var(--cream)',
          borderTop: '1px solid var(--border)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            © 2026 ABY Productions. All rights reserved.
          </span>
          <button
            onClick={handleClose}
            style={{
              background: 'var(--navy)',
              color: 'white',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            className="beta-understand-btn"
          >
            I Understand
          </button>
        </div>
      </div>

      <style>{`
        @keyframes betaOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes betaModalIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .beta-close-btn:hover { background: rgba(255,255,255,0.2) !important; }
        .beta-understand-btn:hover { background: #1a3a5c !important; }
      `}</style>
    </div>
  )
}
