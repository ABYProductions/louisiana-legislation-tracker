'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import { usePathname } from 'next/navigation'

interface Props {
  billId: number
  billNumber: string
  pdfUrl?: string | null
  stateLink: string
}

export default function BillHeaderActions({ billId, billNumber, pdfUrl, stateLink }: Props) {
  const { user } = useAuth()
  const { watchedIds, addWatch, removeWatch } = useWatchlist()
  const pathname = usePathname()
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isWatching = watchedIds.has(billId)

  const handleWatchToggle = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`
      return
    }
    setActionLoading(true)
    if (isWatching) {
      await removeWatch(billId)
    } else {
      await addWatch(billId)
    }
    setActionLoading(false)
  }

  const handleCopy = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
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

  const base: React.CSSProperties = {
    width: '100%',
    padding: '9px 14px',
    borderRadius: '6px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 140ms',
    border: 'none',
    boxSizing: 'border-box',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Watch / Unwatch */}
      <button
        onClick={handleWatchToggle}
        disabled={actionLoading}
        aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
        style={{
          ...base,
          background: isWatching ? 'transparent' : '#C4922A',
          color: isWatching ? '#C4922A' : 'white',
          border: isWatching ? '1.5px solid #C4922A' : 'none',
        }}
      >
        {actionLoading
          ? 'Updating…'
          : isWatching
          ? '✓ Watching — Click to Remove'
          : '+ Add to Watchlist'}
      </button>

      {/* Official Bill Text PDF */}
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View official bill text for ${billNumber} as PDF`}
          style={{
            ...base,
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.15)',
          } as React.CSSProperties}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          Official Bill Text (PDF)
        </a>
      ) : (
        <div style={{ ...base, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed', pointerEvents: 'none' }}>
          Bill Text Unavailable
        </div>
      )}

      {/* View on legis.la.gov */}
      <a
        href={stateLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...base,
          background: 'transparent',
          color: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '11px',
        } as React.CSSProperties}
      >
        View on Legis.la.gov ↗
      </a>

      {/* Copy Link */}
      <button
        onClick={handleCopy}
        style={{
          ...base,
          background: 'transparent',
          color: copied ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)',
          border: copied ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.2)',
          fontSize: '11px',
          padding: '6px 14px',
        }}
      >
        {copied ? '✓ Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}
