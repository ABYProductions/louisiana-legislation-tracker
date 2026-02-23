'use client'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
}

export default function WatchlistPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [bills, setBills] = useState<WatchedBill[]>([])
  const [billsLoading, setBillsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadWatchlist = async () => {
      if (!user) return
      const supabase = getSupabaseBrowser()

      // First get the list of bill IDs this user is watching
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

      // Then fetch the actual bill records
      const { data: billData, error: billsError } = await supabase
        .from('Bills')
        .select('id, bill_number, title, description, status, author, body, last_action_date, last_action, summary')
        .in('id', billIds)

      if (billsError) {
        console.error('Error loading watched bills:', billsError)
        setBills([])
      } else {
        // Sort by most recent activity first
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F4EF' }}>
        <p style={{ color: '#0C2340' }}>Loading your watchlist…</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EF' }}>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
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
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium" style={{ color: '#0C2340' }}>
              ← Browse Bills
            </Link>
            <button
              onClick={signOut}
              className="text-sm px-4 py-2 rounded-lg border border-[#DDD8CE] bg-white"
              style={{ color: '#6B7280' }}
            >
              Sign Out
            </button>
          </div>
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
            <div className="md:col-span-2 space-y-4">
              {bills.map(bill => (
                <div
                  key={bill.id}
                  className="bg-white border border-[#DDD8CE] rounded-xl p-5 hover:border-[#C4922A] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-[#C4922A] mb-1">
                        {bill.bill_number}
                      </div>
                      <Link
                        href={`/bill/${bill.id}`}
                        className="text-base font-semibold"
                        style={{ color: '#0C2340', textDecoration: 'none' }}
                      >
                        {bill.title}
                      </Link>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C4922A]">
                      {bill.status || 'Pre-filed'}
                    </span>
                  </div>
                  {(bill.summary || bill.description) && (
                    <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                      {bill.summary || bill.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs" style={{ color: '#6B7280' }}>
                    <span>{bill.author}</span>
                    {bill.last_action_date && (
                      <span>
                        Last action:{' '}
                        {new Date(bill.last_action_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar: link to full calendar */}
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