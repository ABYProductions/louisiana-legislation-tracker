'use client'

import { useAuth } from '../components/AuthProvider'
import { useWatchlist } from '../components/WatchlistProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '../components/Header'
import { getSupabaseBrowser } from '@/lib/supabase'

type WatchedBill = {
  id: number
  bill_number: string
  title: string
  description: string | null
  author: string | null
  status: string
  body: string | null
  last_action_date: string | null
  last_action: string | null
  summary: string | null
  subjects: { subject_name: string }[] | null
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
        .select('id, bill_number, title, description, status, author, body, last_action_date, last_action, summary, subjects')
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
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return bills.filter(b => {
      if (!b.last_action_date) return false
      const t = new Date(b.last_action_date).getTime()
      return t >= now - thirtyDays
    }).length
  }, [bills])

  if (loading || billsLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F7F4EF' }}>
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <p style={{ color: '#0C2340' }}>Loading your watchlist…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EF' }}>
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">

        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-4xl font-bold"
              style={{ color: '#0C2340', fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              My Watchlist
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {user.email}
            </p>
          </div>
          <Link href="/" className="text-sm font-medium" style={{ color: '#0C2340' }}>
            ← Browse Bills
          </Link>
        </div>

        {/* Dashboard summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#DDD8CE] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              Bills Watched
            </div>
            <div className="text-4xl font-bold" style={{ color: '#0C2340' }}>
              {bills.length}
            </div>
          </div>
          <div className="bg-white border border-[#DDD8CE] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              Recent Activity (30 Days)
            </div>
            <div className="text-4xl font-bold" style={{ color: '#0C2340' }}>
              {upcomingActivityCount}
            </div>
          </div>
          <div className="bg-white border border-[#DDD8CE] rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              Next Step
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Watch floor votes and committee hearings for the bills you care about.
            </p>
          </div>
        </div>

        {/* Main content */}
        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DDD8CE] p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#0C2340' }}>
              Your watchlist is empty
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Browse bills and click &quot;Watch Bill&quot; to track them here.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#0C2340' }}
            >
              Browse Bills
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Watched bills list */}
            <div className="md:col-span-2">
              <div
                className="bg-white border border-[#DDD8CE] rounded-xl overflow-hidden"
              >
                {/* List header */}
                <div
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #DDD8CE',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: '#888', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {bills.length} Bill{bills.length !== 1 ? 's' : ''} Tracked
                  </span>
                </div>

                {/* Bill rows */}
                {bills.map((bill, idx) => {
                  const primarySubject = Array.isArray(bill.subjects) && bill.subjects.length > 0
                    ? bill.subjects[0].subject_name
                    : null
                  const excerpt = (bill.summary || bill.description || '')
                  const shortExcerpt = excerpt.length > 160 ? excerpt.slice(0, 160).trim() + '…' : excerpt

                  return (
                    <div
                      key={bill.id}
                      style={{
                        position: 'relative',
                        padding: '14px 20px 14px 24px',
                        borderBottom: idx < bills.length - 1 ? '1px solid #F0EDE8' : 'none',
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
                        background: '#C4922A',
                        borderRadius: '0 2px 2px 0',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top row: bill number + status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#C4922A',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}>
                            {bill.bill_number}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '9px',
                              fontWeight: 700,
                              color: '#888',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}>
                              {bill.status || 'Pre-filed'}
                            </span>
                            <button
                              onClick={() => removeFromWatchlist(bill.id)}
                              disabled={removing === bill.id}
                              title="Remove from watchlist"
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: removing === bill.id ? '#aaa' : '#B91C1C',
                                background: 'none',
                                border: '1px solid',
                                borderColor: removing === bill.id ? '#ddd' : '#FCA5A5',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: removing === bill.id ? 'default' : 'pointer',
                                letterSpacing: '0.04em',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                              }}
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
                            color: '#0C2340',
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
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#0C2340',
                                background: '#F7F4EF',
                                border: '1px solid #DDD8CE',
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
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#C4922A',
                              background: '#FDF8F0',
                              border: '1px solid #F5E6C8',
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
                              fontSize: '10px',
                              color: '#9CA3AF',
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
                            fontSize: '11px',
                            color: '#6B7280',
                            lineHeight: 1.55,
                            margin: 0,
                            fontWeight: 300,
                          }}>
                            {shortExcerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#DDD8CE] p-5">
                <h2
                  className="text-sm font-semibold mb-2 tracking-[0.12em] uppercase"
                  style={{ color: '#0C2340' }}
                >
                  Upcoming Activity
                </h2>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Use the calendar to see floor sessions and committee hearings that may affect your watched bills.
                </p>
                <Link
                  href="/calendar"
                  className="inline-block px-4 py-2 rounded-lg text-white text-xs font-semibold"
                  style={{ backgroundColor: '#0C2340' }}
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
