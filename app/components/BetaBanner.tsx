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
          padding: '8px 24px',
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
        {/* Left: badge + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{
            background: 'var(--gold)',
            color: 'var(--navy)',
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '2px 8px',
            borderRadius: '3px',
            flexShrink: 0,
          }}>
            BETA
          </span>

          <span
            className="beta-banner-text-full"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            SessionSource is currently in beta. Features are under active development and data may be incomplete.
          </span>

          <span
            className="beta-banner-text-short"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
              display: 'none',
            }}
          >
            Beta — Under active development.
          </span>
        </div>

        {/* Right: "View Disclaimer" + icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '16px' }}>
          <span
            className="beta-banner-cta"
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
        @media (max-width: 640px) {
          .beta-banner-text-full { display: none !important; }
          .beta-banner-text-short { display: inline !important; }
          .beta-banner-cta { display: none !important; }
        }
      `}</style>
    </>
  )
}
