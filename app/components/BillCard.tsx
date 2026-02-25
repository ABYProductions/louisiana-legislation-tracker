'use client'
import Link from 'next/link'
import BillScheduleBadge from './BillScheduleBadge'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import { useState } from 'react'

interface BillCardProps {
  bill: {
    id: number
    bill_number: string
    title: string
    description: string
    status: string
    author: string
    body: string
    last_action_date: string
    summary?: string
    summary_status?: string
    subjects?: { subject_name: string }[]
    next_event?: {
      date: string
      time: string | null
      type: string
      description: string
      location: string | null
    } | null
  }
}

export default function BillCard({ bill }: BillCardProps) {
  const { user, loading } = useAuth()
  const { watchedIds, addWatch, removeWatch } = useWatchlist()
  const [actionLoading, setActionLoading] = useState(false)

  const isWatching = watchedIds.has(bill.id)

  const chamber =
    bill.bill_number?.startsWith('HB') || bill.bill_number?.startsWith('HR')
      ? 'House'
      : bill.bill_number?.startsWith('SB') || bill.bill_number?.startsWith('SR')
      ? 'Senate'
      : bill.body || ''

  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    if (!user) {
      window.location.href = `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setActionLoading(true)
    if (isWatching) {
      await removeWatch(bill.id)
    } else {
      await addWatch(bill.id)
    }
    setActionLoading(false)
  }

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      padding: '22px',
      position: 'relative',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      className="bill-card-hover"
    >
      {/* Gold top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px', background: 'var(--gold)',
      }} />

      <Link href={`/bill/${bill.id}`} style={{ textDecoration: 'none', display: 'block' }}>

        {/* Bill number + chamber */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {bill.bill_number}
          </span>
          {chamber && (
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {chamber}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--navy)',
          lineHeight: 1.3,
          marginBottom: '8px',
        }} className="line-clamp-2">
          {bill.title}
        </h3>

        {/* Summary or description */}
        {(bill.summary_status === 'complete' ? bill.summary : bill.description) && (
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            marginBottom: '14px',
            fontWeight: 300,
          }} className="line-clamp-2">
            {bill.summary_status === 'complete' ? bill.summary : bill.description}
          </p>
        )}
      </Link>

      {/* Watch / Remove button */}
      <button
        onClick={handleWatchToggle}
        disabled={actionLoading}
        style={{
          width: '100%',
          marginBottom: '10px',
          padding: '7px',
          borderRadius: '5px',
          border: isWatching ? '1px solid #FCA5A5' : '1px solid var(--border)',
          background: isWatching ? '#FFF5F5' : 'var(--white)',
          color: isWatching ? '#B91C1C' : 'var(--navy)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: actionLoading ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
        className={isWatching ? 'watch-btn-watching' : ''}
      >
        {actionLoading
          ? '…'
          : isWatching
          ? '✓ Watching — click to remove'
          : '+ Watch Bill'}
      </button>

      {/* Schedule badge */}
      <BillScheduleBadge nextEvent={bill.next_event} />

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--cream-dark)',
        paddingTop: '12px',
        marginTop: '12px',
      }}>
        <Link
          href={`/legislator/${encodeURIComponent(bill.author)}`}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--navy)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {bill.author}
        </Link>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {bill.status || 'Pre-filed'}
        </span>
      </div>

      <style>{`
        .bill-card-hover:hover {
          border-color: #C4922A;
          box-shadow: 0 4px 16px rgba(12,35,64,0.08);
        }
        .watch-btn-watching:hover {
          background: #FEE2E2 !important;
          border-color: #F87171 !important;
        }
      `}</style>
    </div>
  )
}
