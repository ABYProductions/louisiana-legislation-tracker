'use client'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface Folder {
  id: string
  name: string
  color: string
}

export default function WatchBillButton({ billId }: { billId: number }) {
  const { user, loading } = useAuth()
  const { watchedIds, addWatch, removeWatch } = useWatchlist()
  const [actionLoading, setActionLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showFolderPrompt, setShowFolderPrompt] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [folderIds, setFolderIds] = useState<string[]>([])
  const [foldersSaving, setFoldersSaving] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  useEffect(() => { setMounted(true) }, [])

  // Auto-dismiss folder prompt after 5s of no interaction
  useEffect(() => {
    if (showFolderPrompt) {
      dismissTimer.current = setTimeout(() => setShowFolderPrompt(false), 5000)
    }
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [showFolderPrompt])

  const isWatching = watchedIds.has(billId)

  const handleToggle = async () => {
    if (!user) {
      window.location.href = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`
      return
    }
    setActionLoading(true)
    if (isWatching) {
      await removeWatch(billId)
      setShowFolderPrompt(false)
    } else {
      await addWatch(billId)
      // Fetch folders for assignment prompt
      try {
        const res = await fetch('/api/watchlist/folders')
        const data = await res.json()
        if (data.folders?.length > 0) {
          setFolders(data.folders)
          setShowFolderPrompt(true)
        }
      } catch { /* silent */ }
    }
    setActionLoading(false)
  }

  const toggleFolder = async (folderId: string) => {
    // Reset dismiss timer on interaction
    if (dismissTimer.current) clearTimeout(dismissTimer.current)

    const newIds = folderIds.includes(folderId)
      ? folderIds.filter(id => id !== folderId)
      : [...folderIds, folderId]
    setFolderIds(newIds)

    setFoldersSaving(true)
    try {
      await fetch('/api/watchlist/bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: billId, folder_ids: newIds }),
      })
    } finally {
      setFoldersSaving(false)
    }
  }

  if (!mounted) return (
    <div className="btn btn-ghost w-full" style={{ color: 'var(--text-muted)', justifyContent: 'center' }}>
      Loading...
    </div>
  )

  return (
    <div>
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

      {/* Post-add folder assignment prompt */}
      {showFolderPrompt && (
        <div style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-3)',
          background: 'var(--cream)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          animation: 'watchbtn-fadein 150ms ease',
        }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
            Added to watchlist{foldersSaving ? ' · Saving…' : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Add to portfolio:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {folders.map(f => {
              const selected = folderIds.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFolder(f.id)}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${selected ? f.color : 'var(--border)'}`,
                    background: selected ? f.color : 'white',
                    color: selected ? 'white' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {f.name}
                </button>
              )
            })}
            <button
              onClick={() => setShowFolderPrompt(false)}
              style={{
                padding: '2px 10px',
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes watchbtn-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
