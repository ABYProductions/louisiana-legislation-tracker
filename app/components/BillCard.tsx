'use client'
import Link from 'next/link'
import BillScheduleBadge from './BillScheduleBadge'
import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'

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
    subjects?: { subject_name: string }[]
  }
}

export default function BillCard({ bill }: BillCardProps) {
  const { user, loading } = useAuth()
  const [isWatching, setIsWatching] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = getSupabaseBrowser()

  // Check if user is already watching this bill
  useEffect(() => {
    if (!user || loading) return
    supabase
      .from('user_bills')
      .select('bill_id')
      .eq('user_id', user.id)
      .eq('bill_id', bill.id)
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        setIsWatching(!!data)
      })
  }, [user, loading, bill.id])

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
      window.location.href = '/auth/login'
      return
    }
    setActionLoading(true)
    if (isWatching) {
      const { error } = await supabase
        .from('user_bills')
        .delete()
        .eq('user_id', user.id)
        .eq('bill_id', bill.id)
      if (!error) setIsWatching(false)
    } else {
      const { error } = await supabase
        .from('user_bills')
        .upsert({ user_id: user.id, bill_id: bill.id }, { onConflict: 'user_id,bill_id' })
      if (!error) setIsWatching(true)
    }
    setActionLoading(false)
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #DDD8CE',
      padding: '22px',
      position: 'relative',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      className="bill-card-hover"
    >
      {/* Gold top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px', background: '#C4922A',
      }} />

      <Link href={`/bill/${bill.id}`} style={{ textDecoration: 'none', display: 'block' }}>

        {/* Bill number + chamber */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#C4922A',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {bill.bill_number}
          </span>
          {chamber && (
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              color: '#888',
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
          color: '#0C2340',
          lineHeight: 1.3,
          marginBottom: '8px',
        }} className="line-clamp-2">
          {bill.title}
        </h3>

        {/* Summary or description */}
        {(bill.summary || bill.description) && (
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.65,
            marginBottom: '14px',
            fontWeight: 300,
          }} className="line-clamp-2">
            {bill.summary || bill.description}
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
          border: isWatching ? '1px solid #FCA5A5' : '1px solid #DDD8CE',
          background: isWatching ? '#FFF5F5' : '#fff',
          color: isWatching ? '#B91C1C' : '#0C2340',
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
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
      <BillScheduleBadge billId={bill.id} />

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #F0EDE8',
        paddingTop: '12px',
        marginTop: '12px',
      }}>
        <Link
          href={`/legislator/${encodeURIComponent(bill.author)}`}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: '#0C2340',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {bill.author}
        </Link>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '10px',
          fontWeight: 600,
          color: '#C4922A',
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
