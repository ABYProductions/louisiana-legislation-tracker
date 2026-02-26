'use client'

import { useState } from 'react'

export default function ShareBillButton({ billNumber }: { billNumber: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={handleCopy}
        aria-label={`Copy link to ${billNumber}`}
        className="share-bill-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '10px 16px',
          background: 'var(--white)',
          border: '1.5px solid var(--navy)',
          cursor: 'pointer',
          transition: 'all 140ms ease',
          boxSizing: 'border-box',
        }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--navy)', flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--navy)', flexShrink: 0 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--navy)',
        }}>
          {copied ? 'Link Copied!' : 'Copy Link'}
        </span>
      </button>
      <style>{`
        .share-bill-btn:hover {
          background: var(--navy) !important;
        }
        .share-bill-btn:hover span {
          color: white !important;
        }
        .share-bill-btn:hover svg {
          color: white !important;
        }
      `}</style>
    </>
  )
}
