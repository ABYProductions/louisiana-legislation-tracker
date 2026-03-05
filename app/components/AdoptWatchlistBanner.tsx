'use client'

import { useState, useEffect } from 'react'
import AdoptWatchlistModal from '@/app/components/AdoptWatchlistModal'

interface Props {
  token: string
}

export default function AdoptWatchlistBanner({ token }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [successAdded, setSuccessAdded] = useState<number | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { getSupabaseBrowser } = await import('@/lib/supabase')
      const supabase = getSupabaseBrowser()
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setChecked(true)
    }
    checkAuth()
  }, [])

  if (!checked) return null

  if (successAdded !== null) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px',
        background: '#16A34A',
        color: 'white',
        borderRadius: '6px',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: 600,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {successAdded} bill{successAdded !== 1 ? 's' : ''} added to your watchlist
      </div>
    )
  }

  return (
    <>
      {isLoggedIn ? (
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px',
            background: 'var(--gold)',
            color: 'var(--navy)',
            border: 'none',
            borderRadius: '6px',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Adopt This Watchlist
        </button>
      ) : (
        <a
          href={`/auth/signup?adopt=${token}`}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'var(--gold)',
            color: 'var(--navy)',
            borderRadius: '6px',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Adopt This Watchlist
        </a>
      )}

      {showModal && (
        <AdoptWatchlistModal
          token={token}
          onClose={() => setShowModal(false)}
          onSuccess={(added) => {
            setShowModal(false)
            setSuccessAdded(added)
          }}
        />
      )}
    </>
  )
}
