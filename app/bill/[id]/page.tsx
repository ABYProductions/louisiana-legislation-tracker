import { getSupabaseServer } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/app/components/TopBar'
import Footer from '@/app/components/Footer'
import SummaryPending from '@/app/components/SummaryPending'
import ReactMarkdown from 'react-markdown'
import BillHeaderActions from '@/app/components/BillHeaderActions'
import BillWatchlistPanel from '@/app/components/BillWatchlistPanel'
import BillNewsPanel from '@/app/components/BillNewsPanel'

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
  committee?: string
  current_body?: string
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
  pdf_url?: string | null
  history?: any[]
  next_event?: any
}

function laLegisUrl(billNumber: string, sessionYear?: number): string {
  const year = sessionYear ?? new Date().getFullYear()
  const code = `${String(year).slice(-2)}RS`
  return `https://legis.la.gov/legis/BillInfo.aspx?s=${code}&b=${billNumber.replace(/\s+/g, '')}&sbi=y`
}

function parseBillType(billNumber: string): string {
  const match = billNumber?.match(/^([A-Z]+)\d/)
  const prefix = match?.[1] || ''
  const map: Record<string, string> = {
    HB: 'House Bill', SB: 'Senate Bill',
    HCR: 'House Concurrent Resolution', SCR: 'Senate Concurrent Resolution',
    HR: 'House Resolution', SR: 'Senate Resolution',
    HJR: 'House Joint Resolution', SJR: 'Senate Joint Resolution',
  }
  return map[prefix] || prefix || 'Bill'
}

const SESSION_START = new Date('2026-03-09T00:00:00')
const SESSION_END = new Date('2026-06-01T18:00:00')

const panelStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  overflow: 'hidden',
  marginBottom: '16px',
}

function PanelHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{
      background: 'var(--navy)',
      padding: '10px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.18em',
        color: 'white',
      }}>
        {title}
      </span>
      {badge && (
        <span style={{
          background: '#C4922A', color: '#0d2a4a',
          fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          padding: '4px 10px', borderRadius: '3px',
        }}>
          {badge}
        </span>
      )}
    </div>
  )
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

  const BAD_PHRASES = ['I apologize', 'I cannot provide', 'corrupted', 'I must note', 'SessionSource is preparing', 'full legislative text']
  const summaryIsClean = (s: string | null | undefined) =>
    !!s && s.trim().length > 100 && !BAD_PHRASES.some(p => s.toLowerCase().includes(p.toLowerCase()))

  const summaryComplete = typedBill.summary_status === 'complete' && summaryIsClean(typedBill.summary)
  const digestParagraphs = typedBill.digest
    ? typedBill.digest.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : []
  const isAmended = !!typedBill.previous_summary && summaryComplete
  const isProvisional = summaryComplete && !typedBill.extraction_quality
  const showDigestCard = typedBill.extraction_quality === 'digest_only' && digestParagraphs.length > 0
  const summaryDate = typedBill.summary_updated_at
    ? new Date(typedBill.summary_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // History — newest first
  const history = Array.isArray(typedBill.history) && typedBill.history.length > 0
    ? [...typedBill.history]
        .filter((e: any) => e.date && e.action)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : []

  // Session context
  const now = new Date()
  const daysUntilSession = now < SESSION_START
    ? Math.ceil((SESSION_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const dayInSession = now >= SESSION_START && now <= SESSION_END
    ? Math.ceil((now.getTime() - SESSION_START.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const sessionEnded = now > SESSION_END

  const nextEvent = typedBill.next_event as any
  const nextEventDate = nextEvent?.date
    ? new Date(nextEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const stateLink = typedBill.state_link || laLegisUrl(typedBill.bill_number || '', typedBill.session_year)
  const billType = parseBillType(typedBill.bill_number || '')
  const sponsorInitial = typedBill.author?.charAt(0)?.toUpperCase() || '?'

  const detailRows = [
    { label: 'Bill Number', value: typedBill.bill_number },
    { label: 'Session', value: `${typedBill.session_year || 2026} Regular Session` },
    { label: 'Chamber', value: typedBill.body === 'H' ? 'House' : typedBill.body === 'S' ? 'Senate' : typedBill.body },
    { label: 'Type', value: billType },
    { label: 'Status', value: typedBill.status || 'Pre-filed' },
    { label: 'Committee', value: typedBill.committee || null },
    { label: 'Introduced', value: typedBill.created_at ? new Date(typedBill.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null },
    { label: 'Last Action Date', value: typedBill.last_action_date ? new Date(typedBill.last_action_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null },
    { label: 'Last Action', value: typedBill.last_action || null },
  ].filter(r => r.value)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
      <TopBar />

      {/* ── FULL-WIDTH NAVY HEADER ── */}
      <div style={{ background: '#0d2a4a', borderBottom: '3px solid #C4922A', width: '100%' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 32px 0' }}>

          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
              display: 'inline-block', marginBottom: '16px',
            }}
            className="bill-breadcrumb"
          >
            ← All Bills
          </Link>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '32px', alignItems: 'start', paddingBottom: '24px' }}
            className="bill-header-grid"
          >
            {/* LEFT — Bill identity */}
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ background: '#C4922A', color: '#0d2a4a', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '4px' }}>
                  {typedBill.bill_number}
                </span>
                {typedBill.body && (
                  <span style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px' }}>
                    {typedBill.body === 'H' ? 'House' : typedBill.body === 'S' ? 'Senate' : typedBill.body}
                  </span>
                )}
              </div>

              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: '12px' }}>
                {typedBill.title}
              </h1>

              {typedBill.description && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 300 }}>
                  {typedBill.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {typedBill.author && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Sponsor</span>
                    <Link href={`/legislator/${encodeURIComponent(typedBill.author)}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'white', textDecoration: 'none' }}>
                      {typedBill.author}
                    </Link>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Status</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'white' }}>{typedBill.status || 'Pre-filed'}</span>
                </div>
                {typedBill.last_action_date && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Last Action</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'white' }}>
                      {new Date(typedBill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {typedBill.committee && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Committee</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'white' }}>{typedBill.committee}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Action buttons */}
            <BillHeaderActions
              billId={typedBill.id}
              billNumber={typedBill.bill_number}
              pdfUrl={typedBill.pdf_url}
              stateLink={stateLink}
            />
          </div>
        </div>

        {/* Status bar */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 32px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
              {typedBill.session_year || 2026} Regular Session
            </span>
            {typedBill.bill_id && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                Bill ID: {typedBill.bill_id}
              </span>
            )}
            {nextEventDate && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                Next hearing: {nextEventDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN BODY ── */}
      <main style={{ flex: 1, background: 'var(--cream)' }}>
        <div
          style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 64px', display: 'grid', gridTemplateColumns: '62fr 38fr', gap: '24px', alignItems: 'start' }}
          className="bill-cmd-grid"
        >

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* PANEL 1 — BILL ANALYSIS */}
            <div style={panelStyle}>
              <PanelHeader title="Bill Analysis" badge={summaryComplete ? 'AI Analysis' : undefined} />
              <div style={{ padding: '20px 18px' }}>
                {isAmended && (
                  <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--gold)', borderLeft: '4px solid var(--gold)', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--warning)', fontWeight: 600 }}>
                      Bill Amended — Analysis Updated{summaryDate ? ` ${summaryDate}` : ''}
                    </span>
                  </div>
                )}

                {showDigestCard && (
                  <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderLeft: '3px solid var(--navy)', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: '8px' }}>
                      Louisiana Legislative Bureau Summary
                    </div>
                    {digestParagraphs.map((para, i) => (
                      <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.75, fontWeight: 300, marginBottom: i < digestParagraphs.length - 1 ? '10px' : 0 }}>
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {summaryDate && (
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
                    {isProvisional
                      ? 'Preliminary analysis — full review in progress as PDF text becomes available.'
                      : `Analysis as of ${summaryDate} · AI-generated — not legal advice.`}
                  </p>
                )}

                {summaryComplete ? (
                  <div className="bill-summary-content">
                    <ReactMarkdown>{typedBill.summary}</ReactMarkdown>
                  </div>
                ) : !summaryComplete && typedBill.digest && typedBill.digest.trim().length > 100 && typedBill.extraction_quality !== 'digest_only' ? (
                  <div>
                    <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--gold)', borderLeft: '4px solid var(--gold)', padding: '12px 16px', marginBottom: '20px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--navy)' }}>Official Louisiana Legislative Bureau Digest</strong>
                      {' '}— AI analysis is being generated. The official digest is shown below in the meantime.
                    </div>
                    {typedBill.digest.split(/\n\n+/).filter(Boolean).map((para, i) => (
                      <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.8, fontWeight: 300, marginBottom: '16px' }}>
                        {para.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  <SummaryPending />
                )}
              </div>
            </div>

            {/* PANEL 2 — LEGISLATIVE HISTORY */}
            <div style={panelStyle}>
              <PanelHeader title="Legislative History" />
              <div style={{ padding: '20px 18px' }}>
                {history.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No legislative history recorded yet.
                  </p>
                ) : (
                  <div>
                    {history.map((event: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? '#C4922A' : 'rgba(13,42,74,0.2)', flexShrink: 0, marginTop: '3px' }} />
                          {i < history.length - 1 && (
                            <div style={{ width: '2px', flex: 1, minHeight: '16px', background: 'rgba(13,42,74,0.08)', marginTop: '3px' }} />
                          )}
                        </div>
                        <div style={{ paddingBottom: i < history.length - 1 ? '16px' : 0, flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: 'var(--navy)', marginBottom: '2px' }}>
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {event.chamber && (
                              <span style={{ marginLeft: '8px', fontWeight: 400, color: 'var(--text-muted)' }}>
                                {event.chamber === 'H' ? 'House' : event.chamber === 'S' ? 'Senate' : event.chamber}
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {event.action}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PANEL 3 — RELATED NEWS */}
            <div style={panelStyle}>
              <PanelHeader title="Related News" />
              <BillNewsPanel billNumber={typedBill.bill_number} />
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>

            {/* PANEL 1 — BILL DETAILS */}
            <div style={panelStyle}>
              <PanelHeader title="Bill Details" />
              <div style={{ padding: '0 18px' }}>
                {detailRows.map(({ label, value }, i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', padding: '9px 0', borderBottom: i < detailRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--navy)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PANEL 2 — SPONSOR */}
            <div style={panelStyle}>
              <PanelHeader title="Sponsor & Authors" />
              <div style={{ padding: '16px 18px' }}>
                {typedBill.author ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, color: '#C4922A', flexShrink: 0 }}>
                      {sponsorInitial}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '2px' }}>Primary Sponsor</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--navy)', marginBottom: '2px' }}>{typedBill.author}</div>
                      <Link href={`/legislator/${encodeURIComponent(typedBill.author)}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#C4922A', textDecoration: 'none' }}>
                        View profile →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>Sponsor information not available.</p>
                )}
              </div>
            </div>

            {/* PANEL 3 — MY WATCHLIST */}
            <div style={panelStyle}>
              <PanelHeader title="My Watchlist" />
              <div style={{ padding: '16px 18px' }}>
                <BillWatchlistPanel billId={typedBill.id} />
              </div>
            </div>

            {/* PANEL 4 — SESSION CONTEXT */}
            <div style={panelStyle}>
              <PanelHeader title="Session Context" />
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', marginBottom: '12px' }}>
                  {[
                    { label: 'Session', value: '2026 Regular Session' },
                    { label: 'Convenes', value: 'March 9, 2026' },
                    { label: 'Sine Die', value: 'June 1, 2026 (6pm)' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', textAlign: 'center' }}>
                  {daysUntilSession !== null && (
                    <>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{daysUntilSession}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>days until session</div>
                    </>
                  )}
                  {dayInSession !== null && (
                    <>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>Day {dayInSession}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>of the 2026 regular session</div>
                    </>
                  )}
                  {sessionEnded && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)' }}>Session has concluded.</div>
                  )}
                </div>

                {nextEventDate && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '12px', paddingTop: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: '#C4922A' }}>
                      Next hearing: {nextEventDate}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        .bill-breadcrumb:hover { color: #C4922A !important; }
        .bill-summary-content { font-family: var(--font-sans); font-size: 14px; line-height: 1.8; color: var(--text-primary); font-weight: 300; }
        .bill-summary-content h1, .bill-summary-content h2, .bill-summary-content h3 { font-family: var(--font-serif); color: var(--navy); margin: 16px 0 8px; }
        .bill-summary-content p { margin-bottom: 12px; }
        .bill-summary-content ul, .bill-summary-content ol { padding-left: 20px; margin-bottom: 12px; }
        .bill-summary-content li { margin-bottom: 4px; }
        @media (max-width: 900px) {
          .bill-cmd-grid { grid-template-columns: 1fr !important; }
          .bill-header-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bill-cmd-grid { padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}
