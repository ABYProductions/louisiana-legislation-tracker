'use client'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import { useState, useEffect } from 'react'

export default function WatchBillButton({ billId }: { billId: number }) {
  const { user, loading } = useAuth()
  const { watchedIds, addWatch, removeWatch } = useWatchlist()
  const [actionLoading, setActionLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isWatching = watchedIds.has(billId)

  const handleToggle = async () => {
    if (!user) {
      window.location.href = '/auth/login'
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

  if (!mounted) return (
    <div style={{
      padding: '10px 16px',
      border: '1px solid #DDD8CE',
      background: '#fff',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
      color: '#888',
    }}>
      Loading...
    </div>
  )

  return (
    <button
      onClick={handleToggle}
      disabled={actionLoading || loading}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: isWatching ? '#B91C1C' : '#fff',
        background: isWatching ? '#FFF5F5' : '#C4922A',
        border: isWatching ? '1px solid #FCA5A5' : '1px solid #C4922A',
        padding: '10px 16px',
        textAlign: 'center',
        cursor: actionLoading ? 'default' : 'pointer',
        width: '100%',
        transition: 'all 0.15s',
      }}
    >
      {actionLoading
        ? 'Updating…'
        : isWatching
        ? '✓ Watching — click to remove'
        : '+ Watch this Bill'}
    </button>
  )
}
