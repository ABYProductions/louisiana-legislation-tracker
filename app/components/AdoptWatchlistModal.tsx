'use client'

import { useState, useEffect, useCallback } from 'react'

interface ShareMeta {
  title: string | null
  share_type: string
  bill_count: number
}

interface Props {
  token: string
  onClose: () => void
  onSuccess: (added: number) => void
}

export default function AdoptWatchlistModal({ token, onClose, onSuccess }: Props) {
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [loading, setLoading] = useState(false)
  const [metaLoading, setMetaLoading] = useState(true)
  const [error, setError] = useState('')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    fetch(`/api/watchlist/share/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.bill_count !== undefined) setMeta(d)
      })
      .catch(() => {})
      .finally(() => setMetaLoading(false))
  }, [token])

  const handleAdopt = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/watchlist/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: token, mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to adopt watchlist')
      } else {
        onSuccess(data.added)
      }
    } catch {
      setError('Failed to adopt watchlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const billCount = meta?.bill_count ?? 0
  const listTitle = meta?.title || 'this shared watchlist'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adopt-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        width: '480px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: '#F5F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4922A" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 id="adopt-modal-title" style={{
              fontFamily: 'var(--font-serif)', fontSize: '20px',
              fontWeight: 700, color: '#0C2340', margin: 0,
            }}>
              Adopt Watchlist
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        {metaLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: '14px' }}>
            Loading…
          </div>
        ) : !meta ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-sans)', color: '#DC2626', fontSize: '14px' }}>
            This share link is no longer active.
          </div>
        ) : (
          <>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '14px',
              color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6,
            }}>
              Add <strong>{billCount} bill{billCount !== 1 ? 's' : ''}</strong> from{' '}
              <strong>{listTitle}</strong> to your watchlist.
            </p>

            {/* Mode options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{
                display: 'flex', gap: '14px', padding: '16px',
                border: `2px solid ${mode === 'merge' ? '#0C2340' : '#DDD8CE'}`,
                borderRadius: '8px', cursor: 'pointer',
                background: mode === 'merge' ? '#F0F4FF' : 'white',
                transition: 'all 150ms ease',
              }}>
                <input
                  type="radio"
                  name="adopt-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  style={{ marginTop: '2px', flexShrink: 0, accentColor: '#0C2340' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#0C2340', marginBottom: '4px' }}>
                    Merge — Add new bills <span style={{ fontWeight: 400, fontSize: '12px', color: '#C4922A' }}>(Recommended)</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Adds bills from this share to your existing watchlist. Bills you already track are skipped.
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex', gap: '14px', padding: '16px',
                border: `2px solid ${mode === 'replace' ? '#DC2626' : '#DDD8CE'}`,
                borderRadius: '8px', cursor: 'pointer',
                background: mode === 'replace' ? '#FFF5F5' : 'white',
                transition: 'all 150ms ease',
              }}>
                <input
                  type="radio"
                  name="adopt-mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  style={{ marginTop: '2px', flexShrink: 0, accentColor: '#DC2626' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#DC2626', marginBottom: '4px' }}>
                    Replace — Clear my watchlist first
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Removes all bills from your watchlist, then adds all {billCount} bills from this share. This cannot be undone.
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#DC2626', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleAdopt}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: mode === 'replace' ? '#DC2626' : '#0C2340',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginBottom: '12px',
                transition: 'opacity 150ms ease',
              }}
            >
              {loading
                ? 'Adding to watchlist…'
                : mode === 'replace'
                  ? `Replace & Add ${billCount} Bill${billCount !== 1 ? 's' : ''}`
                  : `Add ${billCount} Bill${billCount !== 1 ? 's' : ''} to My Watchlist`}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)', fontSize: '13px',
                cursor: 'pointer', display: 'block', margin: '0 auto',
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
