'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string | null
  body: string | null
  is_read: boolean
  created_at: string
  bill_id: number
  bill_number: string | null
  bill_title: string | null
}

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // Silently fail — migration may not be applied yet
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setOpen(o => !o)
          if (!open) fetchNotifications()
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)', transition: 'color 150ms ease',
        }}
        className="topbar-notif-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-4px',
            minWidth: '16px', height: '16px', borderRadius: '8px',
            background: '#EF4444', color: 'white',
            fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
            border: '1.5px solid var(--navy)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '320px', maxHeight: '400px',
          background: 'white', borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 200, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--navy)',
                  background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)',
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: notif.is_read ? 'white' : 'rgba(196,146,42,0.05)',
                  }}
                >
                  <Link
                    href={`/bill/${notif.bill_id}`}
                    onClick={() => { if (!notif.is_read) markRead(notif.id); setOpen(false) }}
                    style={{ display: 'block', padding: '12px 16px', textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        {notif.bill_number && (
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
                            color: 'var(--navy)', letterSpacing: '0.05em',
                            background: 'rgba(15,41,77,0.08)', padding: '1px 6px', borderRadius: '3px',
                          }}>
                            {notif.bill_number}
                          </span>
                        )}
                        <p style={{
                          fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
                          color: 'var(--text-primary)', margin: '4px 0 2px', lineHeight: 1.4,
                        }}>
                          {notif.title ?? 'Bill Updated'}
                        </p>
                        {notif.body && (
                          <p style={{
                            fontFamily: 'var(--font-sans)', fontSize: '11px',
                            color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4,
                          }}>
                            {notif.body}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatRelative(notif.created_at)}
                        </span>
                        {!notif.is_read && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }} />
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
