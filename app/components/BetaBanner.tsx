'use client'

import { useState, useRef } from 'react'
import BetaDisclaimerModal from './BetaDisclaimerModal'

export default function BetaBanner() {
  const [modalOpen, setModalOpen] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  const openModal = () => setModalOpen(true)
  const closeModal = () => setModalOpen(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openModal()
    }
  }

  return (
    <>
      <div
        ref={bannerRef}
        role="banner"
        aria-label="Beta disclaimer — click to view full disclaimer"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={handleKeyDown}
        className="beta-banner"
        style={{
          width: '100%',
          background: '#1a1a2e',
          borderBottom: '1px solid rgba(196,146,42,0.4)',
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 200,
          transition: 'background 150ms ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: badge + combined text */}
        <div className="beta-banner-left" style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <span style={{
            background: '#C4922A',
            color: 'white',
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '4px',
            marginRight: '8px',
            flexShrink: 0,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            BETA
          </span>
          <span
            className="beta-banner-text"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {'SessionSource is in beta and is not affiliated with the Louisiana Legislature. Data may be incomplete, delayed, or inconsistent with official records. Always verify at '}
            <a
              href="https://legis.la.gov"
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ color: '#C4922A', textDecoration: 'underline', fontWeight: 600 }}
            >
              legis.la.gov
            </a>
            {'. SessionSource does not warrant accuracy or completeness.'}
          </span>
        </div>

        {/* Right: "View Disclaimer" + icon */}
        <div className="beta-banner-cta-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '16px' }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--gold)',
              fontWeight: 500,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            View Disclaimer
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--gold)', flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      </div>

      {modalOpen && (
        <BetaDisclaimerModal onClose={closeModal} bannerRef={bannerRef} />
      )}

      <style>{`
        .beta-banner:hover { background: #16213e !important; }
        .beta-banner:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
        @media (max-width: 768px) {
          .beta-banner { flex-direction: column !important; align-items: flex-start !important; padding: 8px 14px !important; }
          .beta-banner-left { flex: unset !important; width: 100%; overflow: visible; }
          .beta-banner-text { white-space: normal !important; overflow: visible !important; text-overflow: unset !important; }
          .beta-banner-cta-wrap { margin-left: 0 !important; margin-top: 4px !important; font-size: 11px; }
        }
      `}</style>
    </>
  )
}
