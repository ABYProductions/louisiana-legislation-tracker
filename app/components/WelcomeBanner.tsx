'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'

export default function WelcomeBanner() {
  const { user, loading } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading) return
    if (user) return

    try {
      if (!localStorage.getItem('has_visited')) {
        setVisible(true)
        localStorage.setItem('has_visited', '1')
      }
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [user, loading])

  if (!visible) return null

  return (
    <div style={{
      background: 'var(--navy)',
      borderBottom: '1px solid rgba(196,146,42,0.3)',
      padding: 'var(--space-3) var(--space-6)',
    }}>
      <div style={{
        maxWidth: 'var(--width-content)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        {/* Gold accent bar */}
        <div style={{
          width: '3px',
          height: '32px',
          background: 'var(--gold)',
          borderRadius: '2px',
          flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'white',
          }}>
            Welcome to SessionSource
          </span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.6)',
            marginLeft: 'var(--space-2)',
          }}>
            Track Louisiana legislation, get AI-powered summaries, and follow the bills that matter to you.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
          <Link
            href="/auth/signup"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--navy)',
              background: 'var(--gold)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
            }}
          >
            Create Free Account
          </Link>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss welcome banner"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: 'var(--space-1)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
