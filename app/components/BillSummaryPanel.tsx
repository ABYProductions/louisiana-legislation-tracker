'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { getSupabaseBrowser } from '@/lib/supabase'

interface SummaryVersion {
  id: string
  version_number: number
  version_name?: string
  change_type_label?: string
  is_current?: boolean
  summary: string | null
  generated_at: string | null
  created_at: string
}

interface BillSummaryPanelProps {
  summaryHistory: SummaryVersion[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BillSummaryPanel({ summaryHistory }: BillSummaryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then((result: { data: { user: any } }) => {
      setIsAuthenticated(!!result.data.user)
    })
  }, [])

  // Only show if there's more than one version (otherwise there's nothing new to display)
  const priorVersions = summaryHistory.filter(v => !v.is_current || summaryHistory.length > 1)
    .slice(1) // skip current (already shown above)

  if (priorVersions.length === 0) return null

  return (
    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Amendment History
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: '18px', height: '18px', borderRadius: '9px',
          background: 'var(--navy)', color: 'white',
          fontSize: '10px', fontWeight: 700, padding: '0 4px',
        }}>
          {priorVersions.length}
        </span>
      </div>

      {!isAuthenticated && (
        <div style={{
          background: 'rgba(196,146,42,0.06)', border: '1px solid rgba(196,146,42,0.2)',
          borderRadius: '6px', padding: '10px 14px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4922A" strokeWidth="2" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Sign in to view full amendment analysis history
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(showAll ? priorVersions : priorVersions.slice(0, 3)).map(version => {
          const isOpen = expandedId === version.id && isAuthenticated
          const date = formatDate(version.generated_at ?? version.created_at)

          return (
            <div key={version.id} style={{
              border: '1px solid var(--border)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => {
                  if (!isAuthenticated) return
                  setExpandedId(isOpen ? null : version.id)
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px',
                  background: isOpen ? 'var(--navy)' : 'var(--white)',
                  border: 'none', cursor: isAuthenticated ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '8px', transition: 'background 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                    color: isOpen ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)',
                  }}>
                    v{version.version_number}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
                    color: isOpen ? 'white' : 'var(--text-primary)',
                  }}>
                    {version.change_type_label ?? version.version_name ?? 'Amendment'}
                  </span>
                  {date && (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '11px',
                      color: isOpen ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary)',
                    }}>
                      {date}
                    </span>
                  )}
                </div>

                {isAuthenticated && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={isOpen ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)'}
                    strokeWidth="2"
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                )}
              </button>

              {isOpen && version.summary && (
                <div style={{ padding: '16px', background: 'var(--cream)', borderTop: '1px solid var(--border)' }}>
                  <div className="bill-summary-content" style={{ fontSize: '14px' }}>
                    <ReactMarkdown>{version.summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {isOpen && !version.summary && (
                <div style={{ padding: '12px 16px', background: 'var(--cream)', borderTop: '1px solid var(--border)',
                  fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Analysis for this version is being generated.
                </div>
              )}
            </div>
          )
        })}
      </div>

      {priorVersions.length > 3 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            marginTop: '10px',
            fontFamily: 'var(--font-sans)', fontSize: '12px',
            color: 'var(--navy)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
          }}
        >
          {showAll ? 'Show less' : `Show all ${priorVersions.length} versions`}
        </button>
      )}
    </div>
  )
}
