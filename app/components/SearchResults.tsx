'use client'

import Link from 'next/link'
import BillScheduleBadge from './BillScheduleBadge'
import WatchBillButton from './WatchBillButton'
import type { SearchResult } from '@/app/api/search/route'

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

interface SearchResultsProps {
  results: SearchResult[]
  total: number
  page: number
  totalPages: number
  query: string | null
  loading: boolean
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onReset?: () => void
}

// ── Skeleton shimmer card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      padding: '20px 24px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gold accent bar placeholder */}
      <div className="shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px' }} />
      {/* Bill number */}
      <div className="shimmer" style={{ width: '80px', height: '14px', marginBottom: '10px' }} />
      {/* Title */}
      <div className="shimmer" style={{ width: '90%', height: '18px', marginBottom: '6px' }} />
      <div className="shimmer" style={{ width: '60%', height: '18px', marginBottom: '14px' }} />
      {/* Body text */}
      <div className="shimmer" style={{ width: '100%', height: '12px', marginBottom: '5px' }} />
      <div className="shimmer" style={{ width: '85%', height: '12px', marginBottom: '16px' }} />
      {/* Footer row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="shimmer" style={{ width: '120px', height: '12px' }} />
        <div className="shimmer" style={{ width: '60px', height: '12px' }} />
      </div>
      <style>{`
        .shimmer {
          background: linear-gradient(90deg, #f0ece4 25%, #e8e3d8 50%, #f0ece4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 2px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

// ── Chamber badge ──────────────────────────────────────────────────────────
function ChamberBadge({ billNumber }: { billNumber: string }) {
  const upper = billNumber.toUpperCase()
  const isHouse = upper.startsWith('H')
  const isSenate = upper.startsWith('S')
  if (!isHouse && !isSenate) return null
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      fontSize: '11px',
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      background: isHouse ? 'rgba(12,35,64,0.08)' : 'rgba(196,146,42,0.12)',
      color: isHouse ? 'var(--navy)' : 'var(--gold)',
      marginLeft: '8px',
      verticalAlign: 'middle',
    }}>
      {isHouse ? 'House' : 'Senate'}
    </span>
  )
}

// ── Individual result card ─────────────────────────────────────────────────
function ResultCard({ result }: { result: SearchResult }) {
  const displayText = result.summary || result.digest || result.abstract || result.description

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      position: 'relative',
      marginBottom: '12px',
      transition: 'box-shadow 0.15s',
    }}
      className="result-card"
    >
      {/* Gold top accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'var(--gold)',
      }} />

      <div style={{ padding: '20px 24px 16px', paddingTop: '22px' }}>
        {/* Bill number + chamber badge + status badge row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {result.bill_number}
            </span>
            <ChamberBadge billNumber={result.bill_number} />
          </div>
          {result.status && (
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}>
              {result.status}
            </span>
          )}
        </div>

        {/* Title — clickable */}
        <Link
          href={`/bill/${result.id}`}
          style={{ textDecoration: 'none' }}
        >
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--navy)',
            lineHeight: 1.35,
            margin: '0 0 10px 0',
          }}>
            {result.title}
          </h3>
        </Link>

        {/* Match context / summary */}
        {result.headline ? (
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '10px',
            marginBottom: '10px',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}>
              Match context
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
              dangerouslySetInnerHTML={{ __html: result.headline }}
            />
          </div>
        ) : displayText ? (
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: '0 0 10px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {displayText}
          </p>
        ) : null}

        {/* Author + committee */}
        <div style={{ marginBottom: '8px' }}>
          {result.author && (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              By{' '}
              <Link
                href={`/legislator/${encodeURIComponent(result.author)}`}
                style={{ color: 'var(--navy)', fontWeight: 500, textDecoration: 'none' }}
              >
                {result.author}
              </Link>
            </div>
          )}
          {result.committee && (
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}>
              {result.committee}
            </div>
          )}
        </div>

        {/* PDF pill */}
        {result.pdf_url && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <PDFPill url={result.pdf_url} billNumber={result.bill_number} />
          </div>
        )}

        {/* Schedule badge */}
        {result.next_event && (
          <BillScheduleBadge nextEvent={result.next_event} />
        )}

        {/* Watch button */}
        <div style={{ marginTop: '12px' }}>
          <WatchBillButton billId={result.id} />
        </div>
      </div>

      <style>{`
        .result-card:hover {
          box-shadow: 0 2px 12px rgba(12,35,64,0.08);
        }
        .pdf-pill:hover {
          background: var(--cream) !important;
          border-color: var(--navy) !important;
          color: var(--navy) !important;
        }
        mark {
          background: rgba(196,146,42,0.2);
          color: inherit;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build page number list with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 4) pages.push('...')
    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 3) pages.push('...')
    pages.push(totalPages)
  }

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: '6px 11px',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    fontWeight: active ? 700 : 400,
    background: active ? 'var(--navy)' : 'var(--white)',
    color: active ? 'var(--white)' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    border: '1px solid var(--border)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    minWidth: '36px',
    textAlign: 'center',
  })

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '12px',
      marginTop: '24px',
      paddingTop: '20px',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)', flex: '0 0 auto' }}>
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} bills
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={btnStyle(false, page <= 1)}
          aria-label="Previous page"
        >
          &larr; Prev
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={btnStyle(p === page)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={btnStyle(false, page >= totalPages)}
          aria-label="Next page"
        >
          Next &rarr;
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Per page:
        {[25, 50, 100].map(s => (
          <button
            key={s}
            onClick={() => onPageSizeChange(s)}
            style={{
              padding: '4px 9px',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: pageSize === s ? 700 : 400,
              background: pageSize === s ? 'var(--navy)' : 'var(--white)',
              color: pageSize === s ? 'var(--white)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function SearchResults({
  results,
  total,
  page,
  totalPages,
  query,
  loading,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onReset,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div>
        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        padding: '64px 32px',
        textAlign: 'center',
      }}>
        {query ? (
          <>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--navy)', marginBottom: '8px' }}>
              No bills found for &ldquo;{query}&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Try different keywords, check for typos, or broaden your filters.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Suggestions: search by bill number (e.g. &ldquo;HB 42&rdquo;), author name, or subject.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--navy)', marginBottom: '8px' }}>
              No bills match your current filters
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Try removing some filters to see more results.
            </p>
          </>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="btn btn-secondary"
          >
            Browse all bills
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {results.map(result => (
        <ResultCard key={result.id} result={result} />
      ))}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}
