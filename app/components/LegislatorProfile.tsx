'use client'
import { useState } from 'react'

interface LegislatorRecord {
  name: string
  chamber: 'house' | 'senate'
  party: string | null
  district_number: number | null
  photo_url: string | null
  committees: { committee_name: string; role: string; chamber: string }[]
  caucuses: string[]
  parishes_represented: string[]
  year_elected: number | null
  term_end: string | null
}

interface LegislatorProfileProps {
  legislator: LegislatorRecord | null
  legislatorName: string   // from URL / Bills.author, used for monogram fallback
  billCount: number
}

const NAVY  = '#0C2340'
const GOLD  = '#C4922A'
const BG    = '#F7F4EF'
const SERIF = 'Cormorant Garamond, Georgia, serif'
const SANS  = 'DM Sans, system-ui, sans-serif'

// Louisiana legislative election cycles (4-year, odd years)
const LA_ELECTION_CYCLES = [1999, 2003, 2007, 2011, 2015, 2019, 2023, 2027, 2031]

interface TermInfo {
  firstElected: number
  reElections: number[]    // subsequent regular-cycle elections
  termLengthYears: 4
  termLabel: string        // e.g. "1st term" / "2nd term" / "3rd term (final)"
}

function computeTermInfo(yearElected: number | null): TermInfo | null {
  if (!yearElected) return null
  const now = new Date().getFullYear()

  // All regular-cycle election years from first elected through the last completed cycle
  const reElections = LA_ELECTION_CYCLES.filter(y => y > yearElected && y <= now)

  // Total terms = first election + subsequent re-elections
  const totalTerms = 1 + reElections.length
  // Louisiana constitution: max 3 consecutive terms (12 years) per chamber
  const isFinalTerm = totalTerms >= 3

  const ordinal = totalTerms === 1 ? '1st term'
    : totalTerms === 2 ? '2nd term'
    : totalTerms === 3 ? '3rd term'
    : `${totalTerms}th term`

  return {
    firstElected: yearElected,
    reElections,
    termLengthYears: 4,
    termLabel: isFinalTerm ? `${ordinal} (consecutive term limit)` : ordinal,
  }
}

function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0]?.slice(0, 2).toUpperCase() || '?'
}

function PhotoOrMonogram({ photoUrl, name, size = 128 }: { photoUrl: string | null; name: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        style={{
          width: size, height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: `4px solid ${GOLD}`,
          flexShrink: 0,
          display: 'block',
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.15)',
      border: `4px solid ${GOLD}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: SERIF,
        fontSize: size * 0.34,
        fontWeight: 700,
        color: '#fff',
        lineHeight: 1,
      }}>
        {initials(name)}
      </span>
    </div>
  )
}

export default function LegislatorProfile({ legislator, legislatorName, billCount }: LegislatorProfileProps) {
  const name = legislator?.name ?? legislatorName
  const chamber = legislator?.chamber
  const party = legislator?.party
  const district = legislator?.district_number
  const committees = legislator?.committees ?? []
  const caucuses = legislator?.caucuses ?? []
  const parishes = legislator?.parishes_represented ?? []
  const yearElected = legislator?.year_elected

  const partyColor = party === 'Republican' ? '#DC2626'
    : party === 'Democrat' ? '#2563EB'
    : '#6B7280'

  const chamberLabel = chamber === 'house' ? 'House' : chamber === 'senate' ? 'Senate' : null
  return (
    <div style={{ fontFamily: SANS, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(12,35,64,0.10)' }}>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`,
        padding: '40px 48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>

          <PhotoOrMonogram photoUrl={legislator?.photo_url ?? null} name={name} size={128} />

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{
              fontFamily: SERIF,
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 14px',
              lineHeight: 1.1,
            }}>
              {name}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {party && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: partyColor,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                }}>
                  {party}
                </span>
              )}
              {chamberLabel && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {chamberLabel}
                </span>
              )}
              {district != null && (
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  District {district}
                </span>
              )}
              <span style={{
                padding: '4px 14px',
                borderRadius: 999,
                background: GOLD,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
              }}>
                {billCount} {billCount === 1 ? 'Bill' : 'Bills'} This Session
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ background: BG, padding: '40px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 48 }}>

          {/* Left — Committees */}
          <div>
            {committees.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={{
                  fontFamily: SERIF,
                  fontSize: 22,
                  fontWeight: 700,
                  color: NAVY,
                  margin: '0 0 16px',
                  paddingBottom: 8,
                  borderBottom: `2px solid ${GOLD}`,
                }}>
                  Committee Assignments
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {committees.map((c, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: GOLD,
                        flexShrink: 0,
                        marginTop: 7,
                      }} />
                      <span style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.5 }}>
                        {c.committee_name}
                        {c.role !== 'Member' && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            color: GOLD,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {c.role}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {caucuses.length > 0 && (
              <section>
                <h2 style={{
                  fontFamily: SERIF,
                  fontSize: 22,
                  fontWeight: 700,
                  color: NAVY,
                  margin: '0 0 16px',
                  paddingBottom: 8,
                  borderBottom: `2px solid ${GOLD}`,
                }}>
                  Caucus Affiliations
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {caucuses.map((c, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: '#94a3b8',
                        flexShrink: 0,
                        marginTop: 7,
                      }} />
                      <span style={{ fontSize: 15, color: '#475569' }}>{c}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {committees.length === 0 && caucuses.length === 0 && (
              <div style={{
                padding: 24,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                color: '#94a3b8',
                fontSize: 14,
                textAlign: 'center',
              }}>
                Committee data will appear after the session begins.
              </div>
            )}
          </div>

          {/* Right — About */}
          <div>
            <h2 style={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 700,
              color: NAVY,
              margin: '0 0 20px',
              paddingBottom: 8,
              borderBottom: `2px solid ${GOLD}`,
            }}>
              About
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(chamberLabel || district != null) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    District
                  </div>
                  <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>
                    {chamberLabel}{district != null ? ` District ${district}` : ''}
                  </div>
                </div>
              )}

              {parishes.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Parishes Represented
                  </div>
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                    {parishes.join(', ')}
                  </div>
                </div>
              )}

              {yearElected && (() => {
                const termInfo = computeTermInfo(yearElected)
                if (!termInfo) return null
                return (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Term Information
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {termInfo.reElections.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontSize: 13, color: '#64748b' }}>Elected</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{termInfo.firstElected}</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>First elected</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{termInfo.firstElected}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>Re-elected</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{termInfo.reElections.join(', ')}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Term length</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>4 years</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 2 }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Current term</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{termInfo.termLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div style={{ paddingTop: 8 }}>
                <a
                  href="https://legis.la.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: NAVY,
                    textDecoration: 'none',
                    padding: '8px 14px',
                    border: `1px solid ${NAVY}`,
                    borderRadius: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  Official Legislature Profile →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
