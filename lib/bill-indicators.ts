// lib/bill-indicators.ts
// Pure functions for computing bill activity indicators.
// No Supabase calls, no API calls, no side effects.

export type IndicatorTier = 'urgent' | 'attention' | 'info'

export type BillIndicator = {
  id: string
  tier: IndicatorTier
  label: string
  description: string
  color: string
  textColor: string
  borderColor: string
  icon: string
  priority: number
}

function isWithinDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return false
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return d >= threshold
  } catch {
    return false
  }
}

function isAfterToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d >= today
  } catch {
    return false
  }
}

function isOlderThanDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return true
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return d < threshold
  } catch {
    return true
  }
}

function toArray(raw: unknown): unknown[] {
  try {
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') return Object.values(raw as Record<string, unknown>)
    return []
  } catch {
    return []
  }
}

export function computeBillIndicators(
  bill: {
    status?: string | null
    last_action?: string | null
    last_action_date?: string | null
    history?: unknown
    amendments?: unknown
    calendar?: unknown
    votes?: unknown
  },
  userBill: {
    priority?: string | null
    added_at?: string | null
  }
): BillIndicator[] {
  const indicators: BillIndicator[] = []

  const status = (bill.status || '').toLowerCase()
  const lastAction = (bill.last_action || '').toLowerCase()
  const lastActionDate = bill.last_action_date || null

  let amendments: unknown[] = []
  let calendarEntries: unknown[] = []
  let votes: unknown[] = []

  try { amendments = toArray(bill.amendments) } catch { amendments = [] }
  try { calendarEntries = toArray(bill.calendar) } catch { calendarEntries = [] }
  try { votes = toArray(bill.votes) } catch { votes = [] }

  const hasUrgentAlready = () => indicators.some(i => i.tier === 'urgent')

  // ── 1. recently_amended ──────────────────────────────────────────────────────
  const recentlyAmended = (() => {
    try {
      const fromAmendments = amendments.some(a => {
        if (typeof a !== 'object' || a === null) return false
        const obj = a as Record<string, unknown>
        const dateStr = String(obj.date || obj.amendment_date || obj.filed_date || '')
        return isWithinDays(dateStr, 3)
      })
      const fromAction = lastAction.includes('amend') && isWithinDays(lastActionDate, 3)
      return fromAmendments || fromAction
    } catch { return false }
  })()

  if (recentlyAmended) {
    indicators.push({
      id: 'recently_amended',
      tier: 'urgent',
      label: 'Amended',
      description: 'This bill was amended in the last 3 days',
      color: '#FDECEA',
      textColor: '#C0392B',
      borderColor: '#C0392B',
      icon: '📝',
      priority: 1,
    })
  }

  // ── 2. vote_recorded ─────────────────────────────────────────────────────────
  const hasRecentVote = (() => {
    try {
      const fromVotes = votes.some(v => {
        if (typeof v !== 'object' || v === null) return false
        const obj = v as Record<string, unknown>
        const dateStr = String(obj.date || obj.vote_date || '')
        return isWithinDays(dateStr, 3)
      })
      const fromAction = lastAction.includes('vote') && isWithinDays(lastActionDate, 3)
      return fromVotes || fromAction
    } catch { return false }
  })()

  if (hasRecentVote) {
    indicators.push({
      id: 'vote_recorded',
      tier: 'urgent',
      label: 'Vote Recorded',
      description: 'A vote was recorded on this bill recently',
      color: '#FDECEA',
      textColor: '#C0392B',
      borderColor: '#C0392B',
      icon: '🗳️',
      priority: 2,
    })
  }

  // ── 3. passed_committee ───────────────────────────────────────────────────────
  const passedCommittee = (
    (lastAction.includes('reported favorably') ||
     lastAction.includes('passed committee') ||
     lastAction.includes('advanced')) &&
    isWithinDays(lastActionDate, 3)
  )

  if (passedCommittee) {
    indicators.push({
      id: 'passed_committee',
      tier: 'urgent',
      label: 'Passed Committee',
      description: 'This bill passed out of committee recently',
      color: '#E8F5E9',
      textColor: '#2D7A3A',
      borderColor: '#2D7A3A',
      icon: '✅',
      priority: 3,
    })
  }

  // ── 4. failed_dead ────────────────────────────────────────────────────────────
  const isFailed = (
    status.includes('failed') ||
    status.includes('dead') ||
    status.includes('withdrawn') ||
    status.includes('tabled') ||
    status.includes('indefinitely postponed') ||
    ((lastAction.includes('failed') || lastAction.includes('withdrawn')) && isWithinDays(lastActionDate, 3))
  )

  if (isFailed) {
    indicators.push({
      id: 'failed_dead',
      tier: 'urgent',
      label: 'Failed / Dead',
      description: 'This bill has failed or been withdrawn',
      color: '#FDECEA',
      textColor: '#C0392B',
      borderColor: '#C0392B',
      icon: '❌',
      priority: 4,
    })
  }

  // ── 5. governor_action ────────────────────────────────────────────────────────
  const isSigned = lastAction.includes('signed by governor') || lastAction.includes('became law')
  const isVetoed = lastAction.includes('vetoed')
  if ((isSigned || isVetoed) && isWithinDays(lastActionDate, 3)) {
    indicators.push({
      id: 'governor_action',
      tier: 'urgent',
      label: isSigned ? 'Signed into Law' : 'Vetoed',
      description: 'The Governor has acted on this bill',
      color: isSigned ? '#E8F5E9' : '#FDECEA',
      textColor: isSigned ? '#2D7A3A' : '#C0392B',
      borderColor: isSigned ? '#2D7A3A' : '#C0392B',
      icon: '✍️',
      priority: 5,
    })
  }

  // ── 6. recent_activity (fallback — only if no more specific urgent indicator) ──
  if (!hasUrgentAlready() && isWithinDays(lastActionDate, 3)) {
    indicators.push({
      id: 'recent_activity',
      tier: 'urgent',
      label: 'Recent Activity',
      description: 'This bill had activity in the last 3 days',
      color: '#FEF3E2',
      textColor: '#D97706',
      borderColor: '#D97706',
      icon: '⚡',
      priority: 6,
    })
  }

  // ── 7. hearing_scheduled ──────────────────────────────────────────────────────
  const hasHearing = (() => {
    try {
      return calendarEntries.some(e => {
        if (typeof e !== 'object' || e === null) return false
        const obj = e as Record<string, unknown>
        const dateStr = String(obj.date || obj.event_date || '')
        const type = String(obj.type || obj.event_type || '').toLowerCase()
        return isAfterToday(dateStr) && (type.includes('hearing') || type.includes('committee'))
      })
    } catch { return false }
  })()

  if (hasHearing) {
    indicators.push({
      id: 'hearing_scheduled',
      tier: 'attention',
      label: 'Hearing Scheduled',
      description: 'A committee hearing has been scheduled',
      color: '#FDF8EE',
      textColor: '#C4922A',
      borderColor: '#C4922A',
      icon: '🏛️',
      priority: 10,
    })
  }

  // ── 8. floor_calendar ─────────────────────────────────────────────────────────
  const hasFloor = (() => {
    try {
      return calendarEntries.some(e => {
        if (typeof e !== 'object' || e === null) return false
        const obj = e as Record<string, unknown>
        const dateStr = String(obj.date || obj.event_date || '')
        const type = String(obj.type || obj.event_type || '').toLowerCase()
        return isAfterToday(dateStr) && (
          type.includes('floor') ||
          type.includes('special order') ||
          type.includes('calendar')
        )
      })
    } catch { return false }
  })()

  if (hasFloor) {
    indicators.push({
      id: 'floor_calendar',
      tier: 'attention',
      label: 'Floor Vote Scheduled',
      description: 'This bill has been placed on the floor calendar',
      color: '#FDF8EE',
      textColor: '#C4922A',
      borderColor: '#C4922A',
      icon: '📅',
      priority: 11,
    })
  }

  // ── 9. in_committee ───────────────────────────────────────────────────────────
  if (status.includes('committee') && !hasHearing) {
    indicators.push({
      id: 'in_committee',
      tier: 'attention',
      label: 'In Committee',
      description: 'This bill is currently in committee',
      color: '#EEF2FF',
      textColor: '#3730A3',
      borderColor: '#3730A3',
      icon: '🏛️',
      priority: 12,
    })
  }

  // ── 10. enrolled ──────────────────────────────────────────────────────────────
  if (status.includes('enrolled') || status.includes('sent to governor')) {
    indicators.push({
      id: 'enrolled',
      tier: 'attention',
      label: 'Enrolled',
      description: 'This bill has passed both chambers and is awaiting the Governor',
      color: '#E8F5E9',
      textColor: '#2D7A3A',
      borderColor: '#2D7A3A',
      icon: '📜',
      priority: 13,
    })
  }

  // ── 11. no_recent_action ──────────────────────────────────────────────────────
  // Suppressed if: failed/dead indicator present, OR any urgent indicator present
  const hasFailedDead = indicators.some(i => i.id === 'failed_dead')
  if (!hasFailedDead && !hasUrgentAlready() && isOlderThanDays(lastActionDate, 14)) {
    indicators.push({
      id: 'no_recent_action',
      tier: 'info',
      label: 'No Action 14+ Days',
      description: 'No recorded activity in over 2 weeks',
      color: '#F7F4EF',
      textColor: '#666666',
      borderColor: '#DDD8CE',
      icon: '💤',
      priority: 20,
    })
  }

  // ── 12. new_to_watchlist ──────────────────────────────────────────────────────
  if (isWithinDays(userBill.added_at, 7)) {
    indicators.push({
      id: 'new_to_watchlist',
      tier: 'info',
      label: 'New to Watchlist',
      description: 'You added this bill in the last 7 days',
      color: '#F0F4FF',
      textColor: '#3730A3',
      borderColor: '#C7D2FE',
      icon: '⭐',
      priority: 21,
    })
  }

  // Sort by priority, limit to 4
  indicators.sort((a, b) => a.priority - b.priority)
  return indicators.slice(0, 4)
}

export function getTopIndicator(indicators: BillIndicator[]): BillIndicator | null {
  if (!indicators || indicators.length === 0) return null
  return indicators.reduce((a, b) => a.priority < b.priority ? a : b)
}

export function hasUrgentIndicator(indicators: BillIndicator[]): boolean {
  return (indicators || []).some(i => i.tier === 'urgent')
}

export function indicatorSummary(indicators: BillIndicator[]): string {
  if (!indicators || indicators.length === 0) return 'No recent activity'
  return indicators.map(i => i.label).join(', ')
}
