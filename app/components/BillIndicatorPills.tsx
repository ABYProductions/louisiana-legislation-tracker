'use client'

import { useState, useRef, useEffect } from 'react'
import type { BillIndicator } from '@/lib/bill-indicators'

interface Props {
  indicators: BillIndicator[]
  maxVisible?: number
  showTooltips?: boolean
  billId?: number
}

export default function BillIndicatorPills({
  indicators,
  maxVisible = 3,
  showTooltips = true,
  billId,
}: Props) {
  const [hoveredPill, setHoveredPill] = useState<string | null>(null)
  const [expandedPill, setExpandedPill] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expandedPill) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpandedPill(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expandedPill])

  if (!indicators || indicators.length === 0) return null

  const urgentIndicators = (indicators || []).filter(i => i.tier === 'urgent')
  const firstUrgentId = urgentIndicators.length > 0 ? urgentIndicators[0].id : null

  const visibleIndicators = indicators.slice(0, maxVisible)
  const hiddenCount = Math.max(0, indicators.length - maxVisible)

  const handlePillClick = (id: string) => {
    setExpandedPill(prev => prev === id ? null : id)
  }

  const expandedIndicator = expandedPill
    ? (indicators || []).find(i => i.id === expandedPill) ?? null
    : null

  return (
    <div ref={containerRef} style={{ marginTop: '8px' }}>
      {/* ── Pill row ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {(visibleIndicators || []).map((indicator) => (
          <div key={indicator.id} style={{ position: 'relative' }}>
            <button
              onMouseEnter={() => setHoveredPill(indicator.id)}
              onMouseLeave={() => setHoveredPill(null)}
              onClick={() => handlePillClick(indicator.id)}
              aria-label={indicator.label}
              aria-expanded={expandedPill === indicator.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '20px',
                border: `1px solid ${indicator.borderColor}`,
                background: indicator.color,
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 600,
                color: indicator.textColor,
                cursor: 'default',
                whiteSpace: 'nowrap',
                animation:
                  indicator.tier === 'urgent' && indicator.id === firstUrgentId
                    ? 'urgentPulse 2s ease-in-out infinite'
                    : 'none',
              }}
            >
              <span style={{ marginRight: '3px', fontSize: '11px', lineHeight: 1 }}>
                {indicator.icon}
              </span>
              {indicator.label}
            </button>

            {/* Tooltip on hover */}
            {showTooltips && hoveredPill === indicator.id && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0C2340',
                  color: 'white',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  maxWidth: '220px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 500,
                  whiteSpace: 'normal',
                  pointerEvents: 'none',
                  lineHeight: 1.5,
                }}
              >
                {indicator.description}
                {/* Triangle pointer */}
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid #0C2340',
                }} />
              </div>
            )}
          </div>
        ))}

        {/* +N more pill */}
        {hiddenCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: '20px',
            border: '1px solid #DDD8CE',
            background: '#F7F4EF',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: '#888888',
          }}>
            +{hiddenCount} more
          </span>
        )}
      </div>

      {/* ── Inline expanded panel on click ── */}
      {expandedIndicator && (
        <div style={{
          background: 'white',
          border: `1px solid ${expandedIndicator.borderColor}`,
          borderRadius: '8px',
          padding: '14px 18px',
          marginTop: '8px',
          animation: 'indicatorExpand 150ms ease',
        }}>
          {/* Heading */}
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 700,
            color: expandedIndicator.textColor,
            marginBottom: '8px',
          }}>
            {expandedIndicator.icon} {expandedIndicator.label}
          </div>

          {/* Description */}
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: '#555',
            lineHeight: 1.6,
          }}>
            {expandedIndicator.description}
          </div>

          {/* Special content: recently_amended or vote_recorded → bill link */}
          {(expandedIndicator.id === 'recently_amended' || expandedIndicator.id === 'vote_recorded') && billId && (
            <div style={{ marginTop: '10px', fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#888' }}>
              {expandedIndicator.id === 'recently_amended'
                ? 'View the full bill text to see what changed. '
                : 'View the bill page for full vote details. '}
              <a
                href={`/bill/${billId}`}
                style={{ color: '#C4922A', textDecoration: 'none', borderBottom: '1px solid #C4922A' }}
              >
                View bill →
              </a>
            </div>
          )}

          {/* Special content: hearing_scheduled or floor_calendar → schedule warning */}
          {(expandedIndicator.id === 'hearing_scheduled' || expandedIndicator.id === 'floor_calendar') && (
            <div style={{
              background: 'rgba(196,146,42,0.08)',
              border: '1px solid #C4922A',
              borderRadius: '6px',
              padding: '10px 14px',
              marginTop: '10px',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              color: '#9a7420',
              lineHeight: 1.55,
            }}>
              ⚠️ Louisiana Legislature schedules are often posted with limited notice. Verify current schedule at{' '}
              <a
                href="https://legis.la.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#C4922A', textDecoration: 'underline' }}
              >
                legis.la.gov
              </a>{' '}
              before making plans.
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes urgentPulse {
          0%   { box-shadow: 0 0 0 0 rgba(192,57,43,0.4); }
          70%  { box-shadow: 0 0 0 4px rgba(192,57,43,0); }
          100% { box-shadow: 0 0 0 0 rgba(192,57,43,0); }
        }
        @keyframes indicatorExpand {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
