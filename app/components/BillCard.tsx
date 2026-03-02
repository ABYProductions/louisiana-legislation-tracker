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
    pdf_url?: string | null
  }
}

// LegiScan stores numeric status codes (1 = Introduced, 8 = Signed, etc.)
// Map them to readable labels for display.
const LEGISCAN_STATUS: Record<string, string> = {
  '0': 'Pre-filed', '1': 'Introduced', '2': 'Engrossed', '3': 'Enrolled',
  '4': 'Passed', '5': 'Vetoed', '6': 'Failed', '7': 'Override',
  '8': 'Signed', '9': 'Referred', '10': 'Adopted',
}
function legiStatusText(status: string | null | undefined): string {
  if (!status) return 'Pre-filed'
  return LEGISCAN_STATUS[status] ?? status
}

function getStatusColor(status: string): string {
  const s = legiStatusText(status).toLowerCase()
  if (s.includes('sign') || s.includes('enact') || s.includes('act no') || s.includes('chapter')) return '#22C55E'
  if (s.includes('fail') || s.includes('veto') || s.includes('defeat') || s.includes('lost')) return '#EF4444'
  if (s.includes('pass') || s.includes('adopt') || s.includes('concur') || s.includes('enroll')) return '#3B82F6'
  return '#C4922A' // introduced / pre-filed / committee — gold
}

function PDFPill({ url, billNumber }: { url: string; billNumber: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View official bill text PDF for ${billNumber} (opens Louisiana Legislature website)`}
      onClick={(e) => e.stopPropagation()}
      className="pdf-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 140ms ease',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
      Bill Text
    </a>
  )
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

  const statusColor = getStatusColor(bill.status)

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${statusColor}`,
      padding: '22px 22px 22px 20px',
      position: 'relative',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      className="bill-card-hover"
    >

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
          onClick={(e) => e.stopPropagation()}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {bill.pdf_url && <PDFPill url={bill.pdf_url} billNumber={bill.bill_number} />}
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {legiStatusText(bill.status)}
          </span>
        </div>
      </div>

      <style>{`
        .bill-card-hover:hover {
          box-shadow: 0 4px 16px rgba(12,35,64,0.12);
        }
        .watch-btn-watching:hover {
          background: #FEE2E2 !important;
          border-color: #F87171 !important;
        }
        .pdf-pill:hover {
          background: var(--cream) !important;
          border-color: var(--navy) !important;
          color: var(--navy) !important;
        }
      `}</style>
    </div>
  )
}
