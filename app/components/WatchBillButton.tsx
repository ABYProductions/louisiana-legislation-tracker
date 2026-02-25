'use client'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function WatchBillButton({ billId }: { billId: number }) {
  const { user, loading } = useAuth()
  const { watchedIds, addWatch, removeWatch } = useWatchlist()
  const [actionLoading, setActionLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isWatching = watchedIds.has(billId)

  const pathname = usePathname()

  const handleToggle = async () => {
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

  if (!mounted) return (
    <div className="btn btn-ghost w-full" style={{ color: 'var(--text-muted)', justifyContent: 'center' }}>
      Loading...
    </div>
  )

  return (
    <button
      onClick={handleToggle}
      disabled={actionLoading || loading}
      aria-pressed={isWatching}
      aria-label={actionLoading ? 'Updating…' : isWatching ? 'Unwatch this bill' : 'Watch this bill'}
      className={`w-full ${isWatching ? 'btn btn-danger' : 'btn btn-gold'}`}
      style={{ letterSpacing: '0.08em', textTransform: 'uppercase', justifyContent: 'center' }}
    >
      {actionLoading
        ? 'Updating…'
        : isWatching
        ? '✓ Watching — click to remove'
        : '+ Watch this Bill'}
    </button>
  )
}
