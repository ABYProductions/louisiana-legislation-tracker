import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface HistoryItem { date: string; action: string }

interface SharedBill {
  id: number
  bill_number: string
  title: string
  status: string | null
  author: string | null
  committee: string | null
  last_action: string | null
  last_action_date: string | null
  next_event: { date?: string; description?: string } | null
  history: HistoryItem[] | null
  summary: string | null
  summary_status: string | null
  pdf_url?: string | null
}

interface ShareMeta {
  title: string | null
  share_type: string
  created_at: string
  view_count: number
  bill_count: number
}

function PDFPill({ url, billNumber }: { url: string; billNumber: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View official bill text PDF for ${billNumber} (opens Louisiana Legislature website)`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 12px',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        textDecoration: 'none',
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

function formatDate(d: string | null) {
  if (!d) return null
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return d }
}

function formatLong(d: string | null) {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return d }
}

async function getSharedData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://sessionsource.net')
  try {
    const res = await fetch(`${baseUrl}/api/shared/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json() as { share: ShareMeta; bills: SharedBill[] }
  } catch {
    return null
  }
}

export default async function SharedWatchlistPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getSharedData(token)

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-10)',
          maxWidth: '480px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔒</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--navy)', marginBottom: 'var(--space-3)' }}>
            Link No Longer Active
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            This shared watchlist link is no longer active. It may have been revoked by the owner.
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--navy)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            textDecoration: 'none',
          }}>
            Go to SessionSource →
          </Link>
        </div>
      </div>
    )
  }

  const { share, bills } = data
  const pageTitle = share.title || 'Shared Watchlist'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Simple header */}
      <div style={{ background: 'var(--navy)', padding: 'var(--space-5) 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          maxWidth: 'var(--width-content)',
          margin: '0 auto',
          padding: '0 var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{ width: '28px', height: '28px', background: 'var(--gold)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>SS</span>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'white' }}>SessionSource</span>
          </Link>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)' }}>
            Shared Watchlist
          </div>
          <Link href="/auth/signup" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--gold)',
            textDecoration: 'none',
          }}>
            Create your own →
          </Link>
        </div>
      </div>

      {/* Content header */}
      <div style={{ background: 'var(--cream)', padding: 'var(--space-8) 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 var(--space-6)' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', color: 'var(--navy)', marginBottom: 'var(--space-2)', fontWeight: 700 }}>
            {pageTitle}
          </h1>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span>{share.bill_count} bill{share.bill_count !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>Shared via SessionSource</span>
            <span>·</span>
            <span>Updated {formatLong(share.created_at)}</span>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: 'rgba(13,42,74,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginTop: 'var(--space-4)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}>
            This is a read-only view shared by a SessionSource user. Private notes are not included. For the full SessionSource experience,{' '}
            <Link href="/auth/signup" style={{ color: 'var(--navy)', fontWeight: 600 }}>create a free account</Link>.
          </div>
        </div>
      </div>

      {/* Bill list */}
      <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: 'var(--space-6) var(--space-6) var(--space-12)' }}>
        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>
            No bills in this shared watchlist.
          </div>
        ) : (
          bills.map((bill, billIdx) => {
            const history = Array.isArray(bill.history)
              ? [...bill.history].sort((a, b) => b.date.localeCompare(a.date))
              : []
            const showHistoryOpen = billIdx === 0

            return (
              <div key={bill.id} style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                overflow: 'hidden',
              }}>
                {/* Main info */}
                <div style={{ padding: 'var(--space-5)' }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      background: 'var(--cream)',
                      border: '1px solid var(--border)',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>{bill.bill_number}</span>

                    {bill.status && (
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: 'var(--cream)',
                        border: '1px solid var(--border)',
                        padding: '2px 8px',
                        borderRadius: '3px',
                      }}>{bill.status}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    color: 'var(--navy)',
                    marginBottom: 'var(--space-2)',
                    lineHeight: 1.35,
                  }}>
                    {bill.title}
                  </h2>

                  {/* Meta */}
                  {(bill.author || bill.committee) && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                      {bill.author && <span>{bill.author}</span>}
                      {bill.author && bill.committee && <span style={{ margin: '0 6px' }}>·</span>}
                      {bill.committee && <span>{bill.committee}</span>}
                    </div>
                  )}

                  {/* Next event */}
                  {bill.next_event?.date && bill.next_event?.description && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      background: 'var(--cream)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 10px',
                      marginBottom: 'var(--space-3)',
                    }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {formatDate(bill.next_event.date)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {bill.next_event.description}
                      </span>
                    </div>
                  )}

                  {/* Summary */}
                  {bill.summary_status === 'complete' && bill.summary && (
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      margin: 0,
                      borderLeft: '3px solid var(--gold)',
                      paddingLeft: 'var(--space-3)',
                    }}>
                      {bill.summary}
                    </p>
                  )}

                  {/* View full bill + PDF */}
                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <Link href={`/bill/${bill.id}`} style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--navy)',
                      textDecoration: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 12px',
                      transition: 'all 150ms ease',
                    }}>
                      View full bill →
                    </Link>
                    {bill.pdf_url && <PDFPill url={bill.pdf_url} billNumber={bill.bill_number} />}
                  </div>
                </div>

                {/* History (open for first bill) */}
                {history.length > 0 && (
                  <details open={showHistoryOpen} style={{ borderTop: '1px solid var(--border)' }}>
                    <summary style={{
                      padding: 'var(--space-3) var(--space-5)',
                      background: 'var(--cream)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      History ({history.length} entries)
                    </summary>
                    <div
                      role="list"
                      aria-label={`Bill history for ${bill.bill_number}`}
                      style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--white)' }}
                    >
                      {history.map((h, idx) => (
                        <div key={idx} role="listitem" style={{
                          display: 'flex',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-2) 0',
                          borderBottom: idx < history.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: '72px', flexShrink: 0 }}>
                            {formatDate(h.date)}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {h.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        background: 'var(--navy)',
        padding: 'var(--space-12) 0',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'white', marginBottom: 'var(--space-3)', fontWeight: 700 }}>
            Track Louisiana legislation with SessionSource
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'rgba(255,255,255,0.65)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            Free accounts include unlimited bill tracking, AI-powered summaries, and portfolio organization.
          </p>
          <Link href="/auth/signup" style={{
            display: 'inline-block',
            padding: 'var(--space-3) var(--space-8)',
            background: 'var(--gold)',
            color: 'var(--navy)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            textDecoration: 'none',
          }}>
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  )
}
