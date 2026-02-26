'use client'

const MILESTONES = [
  { label: 'Session Opens', date: '2026-03-10' },
  { label: 'Bill Filing Deadline', date: '2026-03-20' },
  { label: 'Committee Deadline — Senate', date: '2026-04-10' },
  { label: 'Committee Deadline — House', date: '2026-04-19' },
  { label: 'Crossover Deadline', date: '2026-05-21' },
  { label: 'Sine Die Approach', date: '2026-06-01' },
  { label: 'Session Ends', date: '2026-06-09' },
]

function formatMilestoneDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SessionTimeline() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the index of the next upcoming milestone
  const nextIdx = MILESTONES.findIndex(m => new Date(m.date + 'T00:00:00') >= today)

  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 'var(--space-4)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--navy)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
        }}>
          2026 Session Timeline
        </span>
      </div>

      {/* Milestones */}
      <div style={{ padding: 'var(--space-3) var(--space-5)' }}>
        {MILESTONES.map((m, idx) => {
          const isPast = nextIdx === -1 || idx < nextIdx
          const isNext = idx === nextIdx

          return (
            <div
              key={m.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) 0',
                borderBottom: idx < MILESTONES.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                position: 'relative',
              }}
            >
              {/* Dot */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                flexShrink: 0,
                background: isNext ? 'var(--gold)' : isPast ? 'var(--text-muted)' : 'var(--border)',
                boxShadow: isNext ? '0 0 0 3px rgba(196,146,42,0.2)' : 'none',
              }} />

              {/* Label */}
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: isNext ? 'var(--navy)' : isPast ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontWeight: isNext ? 700 : 400,
                flex: 1,
                lineHeight: 1.3,
              }}>
                {m.label}
              </span>

              {/* Date */}
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                color: isNext ? 'var(--gold)' : 'var(--text-muted)',
                fontWeight: isNext ? 700 : 400,
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}>
                {formatMilestoneDate(m.date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
