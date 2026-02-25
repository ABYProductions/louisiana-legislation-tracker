'use client'

interface NextEvent {
  date: string
  time: string | null
  type: string
  description: string
  location: string | null
}

interface BillScheduleBadgeProps {
  nextEvent: NextEvent | null | undefined
}

export default function BillScheduleBadge({ nextEvent }: BillScheduleBadgeProps) {
  if (!nextEvent) return null

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const isToday = nextEvent.date === today
  const isTomorrow = nextEvent.date === tomorrow

  const eventDate = new Date(nextEvent.date + 'T00:00:00')
  const label = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : 'UPCOMING'

  return (
    <div className="mt-3 px-3 py-2 rounded-lg border-l-4 text-xs" style={{
      background: isToday ? 'var(--warning-bg)' : 'var(--info-bg)',
      borderLeftColor: isToday ? 'var(--gold)' : 'var(--navy)',
    }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold mb-0.5" style={{ color: isToday ? 'var(--gold)' : 'var(--text-primary)' }}>
            {label}{nextEvent.time && ` · ${nextEvent.time}`}
          </div>
          <div className="truncate" style={{ color: 'var(--text-secondary)' }}>
            {nextEvent.description}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-semibold" style={{ color: 'var(--navy)' }}>
            {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}
