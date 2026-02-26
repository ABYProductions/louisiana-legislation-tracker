'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { getSupabaseBrowser } from '@/lib/supabase'

type WatchedBill = {
  id: number
  bill_number: string
  title: string
  status: string | null
  last_action_date: string | null
}

const RECENT_HOURS = 24

function isRecent(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  return Date.now() - d.getTime() < RECENT_HOURS * 60 * 60 * 1000
}

export default function WatchlistSidebarPanel() {
  const { user, loading } = useAuth()
  const [bills, setBills] = useState<WatchedBill[]>([])
  const [billsLoading, setBillsLoading] = useState(false)

  useEffect(() => {
    if (loading || !user) {
      setBills([])
      return
    }

    setBillsLoading(true)
    const supabase = getSupabaseBrowser()

    const load = async () => {
      const { data: links } = await supabase
        .from('user_bills')
        .select('bill_id')
        .eq('user_id', user.id)
        .limit(5)

      const ids = (links || []).map((l: { bill_id: number }) => l.bill_id).filter(Boolean)
      if (ids.length === 0) {
        setBills([])
        setBillsLoading(false)
        return
      }

      const { data } = await supabase
        .from('Bills')
        .select('id, bill_number, title, status, last_action_date')
        .in('id', ids)

      const sorted = (data || []).sort((a: WatchedBill, b: WatchedBill) => {
        const da = a.last_action_date ? new Date(a.last_action_date).getTime() : 0
        const db = b.last_action_date ? new Date(b.last_action_date).getTime() : 0
        return db - da
      })

      setBills(sorted.slice(0, 5) as WatchedBill[])
      setBillsLoading(false)
    }

    load().catch(() => setBillsLoading(false))
  }, [user?.id, loading])

  if (loading) return null

  if (!user) {
    return (
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--navy)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          marginBottom: 'var(--space-3)',
        }}>
          My Watchlist
        </div>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          marginBottom: 'var(--space-4)',
        }}>
          Sign in to track bills and get notified of committee hearings and floor votes.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link href="/auth/signup" className="btn btn-primary btn-sm">
            Get Started
          </Link>
          <Link href="/auth/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 'var(--space-4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--navy)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
        }}>
          My Watchlist
        </span>
        <Link href="/watchlist" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'var(--gold)',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          View All →
        </Link>
      </div>

      {/* Body */}
      {billsLoading ? (
        <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '48px',
              background: 'var(--cream)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-2)',
            }} />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-3)',
          }}>
            No bills watched yet.
          </p>
          <Link href="/?q=" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--navy)',
            textDecoration: 'underline',
          }}>
            Browse bills to watch
          </Link>
        </div>
      ) : (
        <div>
          {bills.map((bill, idx) => {
            const recent = isRecent(bill.last_action_date)
            return (
              <Link
                key={bill.id}
                href={`/bill/${bill.id}`}
                style={{
                  display: 'block',
                  padding: 'var(--space-3) var(--space-5)',
                  borderBottom: idx < bills.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                  textDecoration: 'none',
                  position: 'relative',
                }}
                className="watchlist-panel-row"
              >
                {recent && (
                  <span style={{
                    position: 'absolute',
                    right: 'var(--space-5)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '3px' }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--gold)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>
                    {bill.bill_number}
                  </span>
                  {bill.status && (
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {bill.status}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--navy)',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  paddingRight: recent ? 'var(--space-6)' : '0',
                }}>
                  {bill.title}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        .watchlist-panel-row:hover { background: var(--cream) !important; }
      `}</style>
    </div>
  )
}
