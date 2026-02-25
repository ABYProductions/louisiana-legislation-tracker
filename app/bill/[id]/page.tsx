import { getSupabaseServer } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillTimeline from '@/app/components/BillTimeline'
import BillScheduleTimeline from '@/app/components/BillScheduleTimeline'
import UpcomingEventsPanel from '@/app/components/UpcomingEventsPanel'
import WatchBillButton from '@/app/components/WatchBillButton'
import SummaryPending from '@/app/components/SummaryPending'

// Always fetch fresh data — bill details change throughout session
export const revalidate = 0

interface Bill {
  id: number
  bill_id: number
  bill_number: string
  title: string
  description: string
  status: string
  author: string
  body: string
  summary: string
  summary_status?: string
  summary_updated_at?: string
  previous_summary?: string
  digest?: string
  abstract?: string
  extraction_quality?: string
  last_action_date: string
  last_action: string
  created_at: string
  url: string
  state_link: string
  session_year?: number
  subjects?: any[]
}

function laLegisUrl(billNumber: string, sessionYear?: number): string {
  const year = sessionYear ?? new Date().getFullYear()
  const code = `${String(year).slice(-2)}RS`
  return `https://legis.la.gov/legis/BillInfo.aspx?s=${code}&b=${billNumber.replace(/\s+/g, '')}&sbi=y`
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = getSupabaseServer()

  const { data: bill, error } = await supabase
    .from('Bills')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !bill) {
    console.error('Error fetching bill:', error)
    notFound()
  }

  const typedBill = bill as Bill
  const summaryComplete  = typedBill.summary_status === 'complete' && !!typedBill.summary
  const summaryParagraphs = summaryComplete
    ? typedBill.summary.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : []
  const digestParagraphs  = typedBill.digest
    ? typedBill.digest.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : []
  const isAmended      = !!typedBill.previous_summary && summaryComplete
  const isProvisional  = summaryComplete && !typedBill.extraction_quality  // LegiScan fallback
  const showDigestCard = typedBill.extraction_quality === 'digest_only' && digestParagraphs.length > 0
  const summaryDate    = typedBill.summary_updated_at
    ? new Date(typedBill.summary_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
      <Header />

      <main style={{ flex: 1, padding: '40px 0 60px' }}>
        <div style={{ maxWidth: 'var(--width-narrow)', margin: '0 auto', padding: '0 24px' }}>

          {/* Back link */}
          <Link href="/" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: 'var(--gold)',
            textDecoration: 'none',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '24px',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Bills
          </Link>

          {/* Bill header card */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderTop: '4px solid var(--gold)',
            padding: '36px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>

                {/* Bill number + chamber badges */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--white)',
                    background: 'var(--navy)',
                    padding: '4px 12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {typedBill.bill_number}
                  </span>
                  {typedBill.body && (
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--navy)',
                      background: 'var(--cream)',
                      border: '1px solid var(--border)',
                      padding: '4px 12px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      {typedBill.body}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--navy)',
                  lineHeight: 1.25,
                  marginBottom: '16px',
                }}>
                  {typedBill.title}
                </h1>

                {/* Description */}
                {typedBill.description && (
                  <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    marginBottom: '20px',
                    fontWeight: 300,
                  }}>
                    {typedBill.description}
                  </p>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  {typedBill.author && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sponsor</span>
                      <Link
                        href={`/legislator/${encodeURIComponent(typedBill.author)}`}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {typedBill.author}
                      </Link>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--gold)', fontWeight: 600 }}>{typedBill.status || 'Pre-filed'}</span>
                  </div>
                  {typedBill.last_action_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Action</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {new Date(typedBill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                <a
                  href={typedBill.state_link || laLegisUrl(typedBill.bill_number || '', typedBill.session_year)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--white)',
                    background: 'var(--navy)',
                    padding: '10px 16px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  View on legis.la.gov
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
<WatchBillButton billId={typedBill.id} />
                <Link
                  href="/"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--navy)',
                    border: '1px solid var(--border)',
                    padding: '10px 16px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    background: 'var(--white)',
                  }}
                >
                  Back to All Bills
                </Link>
              </div>
            </div>
          </div>

          {/* Amendment notice */}
          {isAmended && (
            <div style={{
              background: 'var(--warning-bg)',
              border: '1px solid var(--gold)',
              borderLeft: '4px solid var(--gold)',
              padding: '12px 20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--warning)', fontWeight: 600 }}>
                Bill Amended — Analysis Updated{summaryDate ? ` ${summaryDate}` : ''}
              </span>
            </div>
          )}

          {/* Louisiana Legislative Bureau Digest — shown when full AI analysis unavailable */}
          {showDigestCard && (
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderTop: '3px solid var(--navy)',
              marginBottom: '24px',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--navy)',
                padding: '18px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, color: 'var(--white)', margin: 0 }}>
                    Louisiana Legislative Bureau Summary
                  </h2>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--gold)', margin: '2px 0 0', fontWeight: 400 }}>
                    Prepared by Louisiana Legislative Bureau attorneys
                  </p>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--navy)', background: 'var(--gold)', padding: '4px 10px' }}>
                  Official Digest
                </div>
              </div>
              <div style={{ padding: '28px 32px' }}>
                {digestParagraphs.map((para, i) => (
                  <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.8, fontWeight: 300, marginBottom: i < digestParagraphs.length - 1 ? '16px' : 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* AI Bill Analysis */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderTop: '3px solid var(--gold)',
            marginBottom: '24px',
            overflow: 'hidden',
          }}>
            {/* Summary header */}
            <div style={{
              background: 'var(--navy)',
              padding: '18px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, color: 'var(--white)', margin: 0, letterSpacing: '0.01em' }}>
                  Bill Analysis
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--gold)', margin: '2px 0 0', fontStyle: 'italic', fontWeight: 400 }}>
                  {summaryDate ? `Analysis as of ${summaryDate} · ` : ''}AI-generated analysis — not legal advice. Verify with official sources.
                </p>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--navy)', background: 'var(--gold)', padding: '4px 10px' }}>
                AI Analysis
              </div>
            </div>

            {/* Summary body */}
            <div style={{ padding: '28px 32px' }}>
              {isProvisional && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>
                  Preliminary analysis — full review in progress as PDF text becomes available.
                </p>
              )}
              {summaryComplete ? (
                summaryParagraphs.map((para, i) => (
                  <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.8, fontWeight: 300, marginBottom: i < summaryParagraphs.length - 1 ? '16px' : 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                <SummaryPending />
              )}
            </div>
          </div>

          {/* Two-column layout for timeline + schedule */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="bill-detail-grid">

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <BillTimeline
                history={
                  Array.isArray((typedBill as any).history) && (typedBill as any).history.length > 0
                    ? (typedBill as any).history
                    : [{
                        date: typedBill.last_action_date || typedBill.created_at,
                        action: typedBill.last_action || typedBill.status || 'Pre-filed',
                        chamber: typedBill.body,
                        chamber_id: 1,
                        importance: 2,
                      }]
                }
              />

              {typedBill.last_action && (
                <div style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  padding: '24px',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: '16px',
                  }}>
                    Latest Action
                  </h2>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: '8px', fontWeight: 300 }}>
                    {typedBill.last_action}
                  </p>
                  {typedBill.last_action_date && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(typedBill.last_action_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}

              {/* Bill Information */}
              <div style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                padding: '24px',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--navy)',
                  marginBottom: '16px',
                }}>
                  Bill Information
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: 'Bill ID', value: String(typedBill.bill_id) },
                    { label: 'Bill Number', value: typedBill.bill_number },
                    { label: 'Chamber', value: typedBill.body },
                    { label: 'Status', value: typedBill.status },
                    { label: 'Introduced', value: new Date(typedBill.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  ].map(({ label, value }) => value ? (
                    <div key={label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--cream-dark)',
                    }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <UpcomingEventsPanel
                billId={typedBill.id}
                billNumber={typedBill.bill_number}
                sessionYear={typedBill.session_year}
              />
              <BillScheduleTimeline billId={typedBill.id} billNumber={typedBill.bill_number} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .bill-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
