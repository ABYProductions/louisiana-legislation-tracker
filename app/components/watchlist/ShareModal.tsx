'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Folder } from '@/app/api/watchlist/folders/route'

interface ShareRecord {
  id: string
  share_token: string
  share_type: string
  folder_id: string | null
  title: string | null
  created_at: string
}

interface Props {
  folders: Folder[]
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ShareModal({ folders, onClose }: Props) {
  const [shareType, setShareType] = useState<'full_watchlist' | 'folder'>('full_watchlist')
  const [folderId, setFolderId] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [activeShares, setActiveShares] = useState<ShareRecord[]>([])
  const [sharesLoading, setSharesLoading] = useState(true)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Load existing shares
  useEffect(() => {
    fetch('/api/watchlist/share')
      .then(r => r.json())
      .then(d => setActiveShares(d.shares || []))
      .catch(() => {})
      .finally(() => setSharesLoading(false))
  }, [])

  const generateLink = async () => {
    if (shareType === 'folder' && !folderId) return
    setLoading(true)
    try {
      const body: Record<string, string> = { share_type: shareType }
      if (shareType === 'folder') body.folder_id = folderId
      if (title.trim()) body.title = title.trim()

      const res = await fetch('/api/watchlist/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.share_url) {
        setGeneratedUrl(data.share_url)
        setGeneratedToken(data.share_token)
        setRevoked(false)
        // Add to active shares list
        setActiveShares(prev => [data.share, ...prev])
      }
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const revokeLink = async (token: string) => {
    setRevoking(true)
    try {
      await fetch('/api/watchlist/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: token }),
      })
      if (token === generatedToken) {
        setRevoked(true)
        setGeneratedUrl('')
      }
      setActiveShares(prev => prev.filter(s => s.share_token !== token))
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        width: '500px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h2 id="share-modal-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--navy)', margin: 0 }}>
            Share Watchlist
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {/* Share type toggle */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {(['full_watchlist', 'folder'] as const).map(type => (
            <button
              key={type}
              onClick={() => setShareType(type)}
              style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                border: `1px solid ${shareType === type ? 'var(--navy)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                background: shareType === type ? 'var(--navy)' : 'transparent',
                color: shareType === type ? 'white' : 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {type === 'full_watchlist' ? 'Full Watchlist' : 'Specific Portfolio'}
            </button>
          ))}
        </div>

        {/* Folder selector */}
        {shareType === 'folder' && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-2)' }}>
              Select Portfolio
            </label>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                background: 'white',
              }}
            >
              <option value="">— Select a portfolio —</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.bill_count} bills)</option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-2)' }}>
            Link Title (optional)
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Energy Bills for Client"
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 'var(--space-1)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Recipients will see this title
          </div>
        </div>

        {/* Generate button */}
        {!generatedUrl && !revoked && (
          <button
            onClick={generateLink}
            disabled={loading || (shareType === 'folder' && !folderId)}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              background: 'var(--navy)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || (shareType === 'folder' && !folderId) ? 0.6 : 1,
              marginBottom: 'var(--space-4)',
            }}
          >
            {loading ? 'Generating…' : 'Generate Share Link'}
          </button>
        )}

        {/* Generated URL */}
        {generatedUrl && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input
                readOnly
                value={generatedUrl}
                style={{
                  flex: 1,
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  background: 'var(--cream)',
                }}
              />
              <button
                onClick={copyLink}
                aria-label="Copy share link to clipboard"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: copied ? '#16A34A' : 'var(--navy)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 150ms ease',
                }}
              >
                <span aria-live="polite">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 var(--space-2)' }}>
              Anyone with this link can view your bill list. Your private notes are never shared.
            </p>
            <button
              onClick={() => revokeLink(generatedToken)}
              disabled={revoking}
              style={{ background: 'none', border: 'none', color: '#DC2626', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 0 }}
            >
              {revoking ? 'Revoking…' : 'Revoke this link'}
            </button>
          </div>
        )}

        {revoked && (
          <div style={{ padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Link revoked. Generate a new one above.
          </div>
        )}

        {/* Active shares */}
        {!sharesLoading && activeShares.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-3)' }}>
              Active Share Links
            </div>
            {activeShares.map(s => (
              <div key={s.share_token} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                    {s.title || (s.share_type === 'full_watchlist' ? 'Full Watchlist' : 'Portfolio Share')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Created {formatDate(s.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/shared/${s.share_token}`
                      await navigator.clipboard.writeText(url).catch(() => {})
                    }}
                    aria-label="Copy share link"
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => revokeLink(s.share_token)}
                    aria-label="Revoke share link"
                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
