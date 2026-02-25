'use client'

import { useAuth } from '../components/AuthProvider'
import { useWatchlist } from '../components/WatchlistProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '../components/Header'
import { getSupabaseBrowser } from '@/lib/supabase'

type NextEvent = {
  date: string
  time: string | null
  type: string
  description: string
  location: string | null
}

type WatchedBill = {
  id: number
  bill_number: string
  title: string
  description: string | null
  author: string | null
  status: string
  body: string | null
  current_body: string | null
  committee: string | null
  last_action_date: string | null
  last_action: string | null
  summary: string | null
  summary_status: string | null
  subjects: { subject_name: string }[] | null
  next_event: NextEvent | null
}

export default function WatchlistPage() {
  const { user, loading } = useAuth()
  const { removeWatch } = useWatchlist()
  const router = useRouter()
  const [bills, setBills] = useState<WatchedBill[]>([])
  const [billsLoading, setBillsLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirectTo=/watchlist')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadWatchlist = async () => {
      if (!user) return
      const supabase = getSupabaseBrowser()

      const { data: links, error: linksError } = await supabase
        .from('user_bills')
        .select('bill_id')
        .eq('user_id', user.id)

      if (linksError) {
        console.error('Error loading watchlist links:', linksError)
        setBills([])
        setBillsLoading(false)
        return
      }

      const billIds = (links || []).map((l: any) => l.bill_id).filter(Boolean)
      if (billIds.length === 0) {
        setBills([])
        setBillsLoading(false)
        return
      }

      const { data: billData, error: billsError } = await supabase
        .from('Bills')
        .select('id, bill_number, title, description, status, author, body, current_body, committee, last_action_date, last_action, summary, summary_status, subjects, next_event')
        .in('id', billIds)

      if (billsError) {
        console.error('Error loading watched bills:', billsError)
        setBills([])
      } else {
        const sorted = (billData || []).sort((a: any, b: any) => {
          const da = a.last_action_date ? new Date(a.last_action_date).getTime() : 0
          const db = b.last_action_date ? new Date(b.last_action_date).getTime() : 0
          return db - da
        })
        setBills(sorted as WatchedBill[])
      }

      setBillsLoading(false)
    }

    if (!loading && user) {
      loadWatchlist()
    }
  }, [user, loading])

  const removeFromWatchlist = async (billId: number) => {
    setRemoving(billId)
    const ok = await removeWatch(billId)
    if (ok) {
      setBills(prev => prev.filter(b => b.id !== billId))
    }
    setRemoving(null)
  }

  const upcomingActivityCount = useMemo(() => {
    return bills.filter(b => b.next_event != null).length
  }, [bills])

  if (loading || billsLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <p style={{ color: 'var(--navy)' }}>Loading your watchlist…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">

        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-4xl font-bold"
              style={{ color: 'var(--navy)', fontFamily: 'var(--font-serif)' }}
            >
              My Watchlist
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {user.email}
            </p>
          </div>
          <Link href="/" className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
            ← Browse Bills
          </Link>
        </div>

        {/* Dashboard summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Bills Watched
            </div>
            <div className="text-4xl font-bold" style={{ color: 'var(--navy)' }}>
              {bills.length}
            </div>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>
              With Upcoming Events
            </div>
            <div className="text-4xl font-bold" style={{ color: 'var(--navy)' }}>
              {upcomingActivityCount}
            </div>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              Next Step
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Watch floor votes and committee hearings for the bills you care about.
            </p>
          </div>
        </div>

        {/* Main content */}
        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>
              Your watchlist is empty
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Browse bills and click &quot;Watch Bill&quot; to track them here.
            </p>
            <Link
              href="/"
              className="btn btn-primary"
            >
              Browse Bills
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Watched bills list */}
            <div className="md:col-span-2">
              <div
                className="bg-white border border-[var(--border)] rounded-xl overflow-hidden"
              >
                {/* List header */}
                <div
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {bills.length} Bill{bills.length !== 1 ? 's' : ''} Tracked
                  </span>
                </div>

                {/* Bill rows */}
                {bills.map((bill, idx) => {
                  const primarySubject = Array.isArray(bill.subjects) && bill.subjects.length > 0
                    ? bill.subjects[0].subject_name
                    : null
                  // Use description when summary is pending to avoid showing the placeholder text
                  const excerptText = bill.summary_status === 'complete' && bill.summary
                    ? bill.summary
                    : (bill.description || '')
                  const shortExcerpt = excerptText.length > 160 ? excerptText.slice(0, 160).trim() + '…' : excerptText

                  return (
                    <div
                      key={bill.id}
                      style={{
                        position: 'relative',
                        padding: '14px 20px 14px 24px',
                        borderBottom: idx < bills.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* Left gold accent */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'var(--gold)',
                        borderRadius: '0 2px 2px 0',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top row: bill number + status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--gold)',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}>
                            {bill.bill_number}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}>
                              {bill.status || 'Pre-filed'}
                            </span>
                            <button
                              onClick={() => removeFromWatchlist(bill.id)}
                              disabled={removing === bill.id}
                              aria-label={`Remove ${bill.bill_number} from watchlist`}
                              className={`btn btn-danger btn-sm${removing === bill.id ? ' opacity-50' : ''}`}
                            >
                              {removing === bill.id ? 'Removing…' : '× Remove'}
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/bill/${bill.id}`}
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--navy)',
                            textDecoration: 'none',
                            lineHeight: 1.3,
                            display: 'block',
                            marginBottom: '6px',
                          }}
                        >
                          {bill.title}
                        </Link>

                        {/* Labels row: author + subject */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: shortExcerpt ? '6px' : '0' }}>
                          {bill.author && (
                            <Link
                              href={`/legislator/${encodeURIComponent(bill.author)}`}
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                color: 'var(--navy)',
                                background: 'var(--cream)',
                                border: '1px solid var(--border)',
                                borderRadius: '3px',
                                padding: '2px 7px',
                                textDecoration: 'none',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {bill.author}
                            </Link>
                          )}
                          {primarySubject && (
                            <span style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              color: 'var(--gold)',
                              background: 'var(--cream)',
                              border: '1px solid var(--border)',
                              borderRadius: '3px',
                              padding: '2px 7px',
                              letterSpacing: '0.04em',
                            }}>
                              {primarySubject}
                            </span>
                          )}
                          {bill.last_action_date && (
                            <span style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                              padding: '2px 0',
                            }}>
                              {new Date(bill.last_action_date + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        {/* Summary excerpt */}
                        {shortExcerpt && (
                          <p style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.55,
                            margin: 0,
                            fontWeight: 300,
                          }}>
                            {shortExcerpt}
                          </p>
                        )}

                        {/* Current status / next scheduled event — mirrors "Current Status" on legis.la.gov */}
                        {(() => {
                          // Prefer a real scheduled upcoming event
                          if (bill.next_event) {
                            const today = new Date().toISOString().split('T')[0]
                            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                            const isToday = bill.next_event.date === today
                            const isTomorrow = bill.next_event.date === tomorrow
                            const label = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : new Date(bill.next_event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            return (
                              <div style={{
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: isToday ? 'var(--warning-bg)' : 'var(--info-bg)',
                                borderLeft: `3px solid ${isToday ? 'var(--gold)' : 'var(--navy)'}`,
                                borderRadius: '0 4px 4px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: isToday ? 'var(--gold)' : 'var(--navy)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                                  {label}
                                </span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {bill.next_event.description}
                                </span>
                              </div>
                            )
                          }
                          // Fall back to committee assignment — mirrors "Current Status" on legis.la.gov
                          // e.g., "Pending House Appropriations"
                          if (bill.committee) {
                            const chamberName = bill.current_body === 'H' ? 'House' : bill.current_body === 'S' ? 'Senate' : null
                            const statusText = chamberName
                              ? `Pending ${chamberName} ${bill.committee}`
                              : `Pending ${bill.committee}`
                            return (
                              <div style={{
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: 'var(--info-bg)',
                                borderLeft: '3px solid var(--text-secondary)',
                                borderRadius: '0 4px 4px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                                  STATUS
                                </span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {statusText}
                                </span>
                              </div>
                            )
                          }
                          // Last resort: show status field if meaningful
                          if (bill.status && bill.status !== 'Introduced') {
                            return (
                              <div style={{
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: 'var(--cream)',
                                borderLeft: '3px solid var(--text-muted)',
                                borderRadius: '0 4px 4px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                                  STATUS
                                </span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {bill.status}
                                </span>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[var(--border)] p-5">
                <h2
                  className="text-sm font-semibold mb-2 tracking-[0.12em] uppercase"
                  style={{ color: 'var(--navy)' }}
                >
                  Upcoming Activity
                </h2>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Use the calendar to see floor sessions and committee hearings that may affect your watched bills.
                </p>
                <Link
                  href="/calendar"
                  className="btn btn-primary btn-sm"
                >
                  View Legislative Calendar
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
