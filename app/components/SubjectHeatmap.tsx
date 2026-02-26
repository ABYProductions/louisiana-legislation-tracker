'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SubjectItem {
  name: string
  bill_count: number
  pct_of_max: number
}

interface BillCard {
  id: number
  bill_number: string
  title: string
  status: string | null
  sponsor: string | null
  committee: string | null
  last_action: string | null
  last_action_date: string | null
  next_event: string | null
}

function getTileStyle(index: number, selected: boolean): React.CSSProperties {
  if (index < 4) {
    // Tier 1 — navy
    return {
      background: selected ? '#1a5276' : 'var(--navy)',
      color: '#fff',
      border: selected ? '2px solid var(--gold)' : '2px solid transparent',
      boxShadow: selected ? '0 0 0 2px rgba(196,146,42,0.25)' : 'none',
    }
  }
  if (index < 10) {
    // Tier 2 — navy-light
    return {
      background: selected ? '#224e75' : '#1a3a5c',
      color: '#fff',
      border: selected ? '2px solid var(--gold)' : '2px solid transparent',
      boxShadow: selected ? '0 0 0 2px rgba(196,146,42,0.25)' : 'none',
      opacity: 0.9,
    }
  }
  if (index < 16) {
    // Tier 3 — cream-dark
    return {
      background: selected ? 'var(--navy)' : 'var(--cream-dark)',
      color: selected ? '#fff' : 'var(--navy)',
      border: selected ? '2px solid var(--gold)' : '1px solid var(--border)',
      boxShadow: selected ? '0 0 0 2px rgba(196,146,42,0.25)' : 'none',
    }
  }
  // Tier 4 — white
  return {
    background: selected ? 'var(--navy)' : 'var(--white)',
    color: selected ? '#fff' : 'var(--text-secondary)',
    border: selected ? '2px solid var(--gold)' : '1px solid var(--border)',
    boxShadow: selected ? '0 0 0 2px rgba(196,146,42,0.25)' : 'none',
  }
}

function getCountColor(index: number, selected: boolean): string {
  if (index < 10) return selected ? 'var(--gold-light)' : 'var(--gold)'
  return selected ? 'var(--gold-light)' : 'var(--text-muted)'
}

function SkeletonTile() {
  return (
    <div style={{
      height: '56px',
      background: 'var(--cream)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--cream)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      height: '96px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function SubjectHeatmap() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedBills, setSelectedBills] = useState<BillCard[]>([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [billsTotal, setBillsTotal] = useState(0)
  const billsCache = useRef(new Map<string, { bills: BillCard[]; total: number }>())
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(d => {
        setSubjects(d.subjects || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleTileClick = useCallback(async (name: string) => {
    if (name === selectedSubject) {
      setSelectedSubject(null)
      return
    }
    setSelectedSubject(name)

    const cached = billsCache.current.get(name)
    if (cached) {
      setSelectedBills(cached.bills)
      setBillsTotal(cached.total)
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
      return
    }

    setBillsLoading(true)
    setSelectedBills([])
    try {
      const r = await fetch(`/api/subjects/${encodeURIComponent(name)}`)
      const d = await r.json()
      const result = { bills: d.bills || [], total: d.total || 0 }
      billsCache.current.set(name, result)
      setSelectedBills(result.bills)
      setBillsTotal(result.total)
    } finally {
      setBillsLoading(false)
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [selectedSubject])

  return (
    <div style={{ width: '100%' }}>
      {/* ── Component header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '32px',
        marginBottom: 'var(--space-3)',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
        }}>
          Browse by Subject
        </span>
        {!loading && (
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}>
            {subjects.length} subject areas
          </span>
        )}
      </div>

      {/* ── Tile grid ── */}
      <div
        role="list"
        aria-label="Legislative subject areas"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: 'repeat(3, 56px)',
          gap: '8px',
          overflow: 'hidden',
          height: `${3 * 56 + 2 * 8}px`,
        }}
        className="subject-heatmap-grid"
      >
        {loading
          ? Array.from({ length: 18 }).map((_, i) => (
              <div key={i} role="listitem"><SkeletonTile /></div>
            ))
          : subjects.slice(0, 18).map((s, i) => {
              const selected = s.name === selectedSubject
              const tileStyle = getTileStyle(i, selected)
              return (
                <div key={s.name} role="listitem">
                  <button
                    aria-expanded={selected}
                    aria-label={`${s.name}: ${s.bill_count} bills`}
                    onClick={() => handleTileClick(s.name)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleTileClick(s.name)
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: 'var(--space-2) var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      ...tileStyle,
                    }}
                    className="subject-tile"
                  >
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-semibold)',
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      color: getCountColor(i, selected),
                    }}>
                      {s.bill_count} bills
                    </span>
                  </button>
                </div>
              )
            })
        }
      </div>

      {/* ── Expansion panel ── */}
      <div
        ref={panelRef}
        role="region"
        aria-label={selectedSubject ? `${selectedSubject} bills` : undefined}
        aria-live="polite"
        style={{
          maxHeight: selectedSubject ? '800px' : '0',
          overflow: 'hidden',
          transition: 'max-height 350ms ease',
          marginTop: selectedSubject ? '12px' : '0',
        }}
      >
        {selectedSubject && (
          <div>
            {/* Panel header */}
            <div style={{
              height: '48px',
              background: 'var(--navy)',
              padding: '0 var(--space-5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--weight-semibold)',
                  color: '#fff',
                }}>
                  {selectedSubject}
                </span>
                {!billsLoading && (
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gold)',
                  }}>
                    {billsTotal} bill{billsTotal !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <a
                  href={`/?subject=${encodeURIComponent(selectedSubject)}#bills`}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--gold)',
                    textDecoration: 'none',
                  }}
                >
                  View all →
                </a>
                <button
                  onClick={() => setSelectedSubject(null)}
                  aria-label={`Close ${selectedSubject} panel`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    opacity: 0.6,
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: '0',
                    transition: 'opacity 150ms ease',
                  }}
                  className="panel-close-btn"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Bill cards grid */}
            <div style={{
              padding: 'var(--space-5)',
              background: 'var(--cream)',
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              maxHeight: '520px',
              overflowY: 'auto',
            }}
              className="panel-bills-scroll"
            >
              {billsLoading ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--space-3)',
                }}>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : selectedBills.length === 0 ? (
                <div style={{
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-muted)',
                }}>
                  No bills found for this subject.
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 'var(--space-3)',
                  }}>
                    {selectedBills.map(bill => (
                      <article
                        key={bill.id}
                        role="article"
                        tabIndex={0}
                        aria-label={`${bill.bill_number}: ${bill.title}`}
                        onClick={() => router.push(`/bill/${bill.id}`)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') router.push(`/bill/${bill.id}`)
                        }}
                        style={{
                          background: 'var(--white)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-3) var(--space-4)',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          fontFamily: 'var(--font-sans)',
                        }}
                        className="panel-bill-card"
                      >
                        {/* Row 1 — badges */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-xs)',
                            background: 'var(--navy)',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: '2px',
                          }}>
                            {bill.bill_number}
                          </span>
                          {bill.status && (
                            <span style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                              background: 'var(--cream)',
                              padding: '1px 6px',
                              borderRadius: '2px',
                              border: '1px solid var(--border)',
                            }}>
                              {bill.status.length > 20 ? bill.status.slice(0, 20) + '…' : bill.status}
                            </span>
                          )}
                        </div>

                        {/* Row 2 — title */}
                        <div style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--weight-medium)',
                          color: 'var(--navy)',
                          marginTop: 'var(--space-1)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.35,
                        }}>
                          {bill.title || 'Untitled Bill'}
                        </div>

                        {/* Row 3 — sponsor */}
                        {bill.sponsor && (
                          <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-1)',
                          }}>
                            {bill.sponsor}
                          </div>
                        )}

                        {/* Row 4 — next event */}
                        {bill.next_event && (
                          <div style={{
                            display: 'inline-block',
                            marginTop: 'var(--space-2)',
                            background: 'rgba(196,146,42,0.08)',
                            border: '1px solid rgba(196,146,42,0.3)',
                            color: 'var(--warning)',
                            fontSize: 'var(--text-xs)',
                            borderRadius: 'var(--radius-full)',
                            padding: '1px 8px',
                          }}>
                            📅 {bill.next_event}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>

                  {billsTotal > 24 && (
                    <div style={{
                      textAlign: 'center',
                      marginTop: 'var(--space-4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                    }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Showing 24 of {billsTotal} bills
                      </span>
                      <a
                        href={`/?subject=${encodeURIComponent(selectedSubject)}#bills`}
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--gold)',
                          textDecoration: 'none',
                        }}
                      >
                        View all in search →
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .subject-tile:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
          border-bottom: 2px solid var(--gold) !important;
        }
        .panel-close-btn:hover { opacity: 1 !important; }
        .panel-bill-card:hover {
          border-color: var(--navy) !important;
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm) !important;
        }
        .panel-bills-scroll::-webkit-scrollbar { width: 4px; }
        .panel-bills-scroll::-webkit-scrollbar-track { background: transparent; }
        .panel-bills-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        @media (max-width: 900px) {
          .subject-heatmap-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            grid-template-rows: repeat(3, 56px) !important;
            height: ${3 * 56 + 2 * 8}px !important;
          }
        }
        @media (max-width: 600px) {
          .subject-heatmap-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(3, 56px) !important;
            height: ${3 * 56 + 2 * 8}px !important;
          }
        }
      `}</style>
    </div>
  )
}
