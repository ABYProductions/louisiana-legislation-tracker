import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 3600 // cache 1 hour

export interface SearchMetadata {
  statuses: Array<{ value: string; label: string; count: number }>
  committees: Array<{ name: string; chamber: 'House' | 'Senate' | 'Other'; count: number }>
  subjects: Array<{ name: string; count: number }>
  bill_types: string[]
  sponsors: Array<{ name: string; chamber: string; district?: string }>
  session: string
  total_bills: number
}

export async function GET(_req: NextRequest): Promise<NextResponse<SearchMetadata>> {
  const supabase = getSupabaseServer()

  const { data: bills } = await supabase
    .from('Bills')
    .select('status, committee, subjects, bill_type, author, body')
    .limit(2000)

  const rows = bills || []

  // Statuses with counts
  const statusMap = new Map<string, number>()
  for (const r of rows) {
    if (r.status) statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1)
  }
  const statuses = [...statusMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      label: friendlyStatus(value),
      count,
    }))

  // Committees with counts and chamber detection
  const committeeMap = new Map<string, number>()
  for (const r of rows) {
    if (r.committee) {
      committeeMap.set(r.committee, (committeeMap.get(r.committee) || 0) + 1)
    }
  }
  const committees = [...committeeMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({
      name,
      chamber: detectChamber(name, rows),
      count,
    }))

  // Subjects with counts
  const subjectMap = new Map<string, number>()
  for (const r of rows) {
    if (!Array.isArray(r.subjects)) continue
    for (const s of r.subjects) {
      const name = s?.subject_name?.trim()
      if (name) subjectMap.set(name, (subjectMap.get(name) || 0) + 1)
    }
  }
  const subjects = [...subjectMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  // Bill types
  const billTypeSet = new Set<string>()
  for (const r of rows) {
    if (r.bill_type) billTypeSet.add(r.bill_type)
  }
  const bill_types = ['HB', 'SB', 'HCR', 'SCR', 'HR', 'SR'].filter(
    t => billTypeSet.has(t) || rows.some(r => r.bill_type === t)
  )
  // Also include any non-standard types found
  for (const t of billTypeSet) {
    if (!bill_types.includes(t)) bill_types.push(t)
  }

  // Sponsors (from Bills.author — legislators table may not exist)
  const sponsorMap = new Map<string, { name: string; chamber: string }>()
  for (const r of rows) {
    if (!r.author) continue
    if (!sponsorMap.has(r.author)) {
      const chamber = r.body === 'H' ? 'House' : r.body === 'S' ? 'Senate' : 'Unknown'
      sponsorMap.set(r.author, { name: r.author, chamber })
    }
  }
  const sponsors = [...sponsorMap.values()].sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    statuses,
    committees,
    subjects,
    bill_types,
    sponsors,
    session: '2026 Regular Session',
    total_bills: rows.length,
  })
}

function friendlyStatus(raw: string): string {
  // LegiScan uses numeric status codes
  const numericMap: Record<string, string> = {
    '1': 'Introduced',
    '2': 'Engrossed',
    '3': 'Enrolled',
    '4': 'Passed',
    '5': 'Vetoed',
    '6': 'Failed',
    '7': 'Override',
    '8': 'Chaptered',
    '9': 'Refer',
    '10': 'Report Pass',
    '11': 'Report DNP',
    '12': 'Draft',
  }
  if (numericMap[raw]) return numericMap[raw]
  return raw // already a string status
}

function detectChamber(
  name: string,
  bills: any[]
): 'House' | 'Senate' | 'Other' {
  const lower = name.toLowerCase()
  if (lower.includes('house') || lower.startsWith('h ') || lower.startsWith('h.')) {
    return 'House'
  }
  if (lower.includes('senate') || lower.startsWith('s ') || lower.startsWith('s.')) {
    return 'Senate'
  }
  // Infer from which bills reference this committee
  const houseCount = bills.filter(
    b => b.committee === name && b.body === 'H'
  ).length
  const senateCount = bills.filter(
    b => b.committee === name && b.body === 'S'
  ).length
  if (houseCount > senateCount) return 'House'
  if (senateCount > houseCount) return 'Senate'
  return 'Other'
}
