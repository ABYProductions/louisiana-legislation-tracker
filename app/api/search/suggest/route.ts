import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 300 // cache 5 min

export interface Suggestion {
  type: 'bill' | 'legislator' | 'topic' | 'committee'
  label: string
  subtitle?: string
  url?: string
  value?: string
}

// Common Louisiana legislative topics for quick suggestions
const COMMON_TOPICS = [
  'criminal justice', 'education', 'healthcare', 'taxation', 'appropriations',
  'infrastructure', 'environment', 'agriculture', 'civil rights', 'elections',
  'insurance', 'judiciary', 'local government', 'budget', 'constitutional amendment',
  'public safety', 'workers compensation', 'firearms', 'gaming', 'oil and gas',
  'coastal restoration', 'flood protection', 'school choice', 'charter schools',
  'law enforcement', 'corrections', 'death penalty', 'abortion', 'family law',
  'property tax', 'income tax', 'sales tax', 'business regulation', 'licensing',
]

export async function GET(req: NextRequest): Promise<NextResponse<{ suggestions: Suggestion[] }>> {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const lower = q.toLowerCase()
  const supabase = getSupabaseServer()
  const suggestions: Suggestion[] = []

  // Run queries in parallel
  const [billsResult, legislatorsResult] = await Promise.allSettled([
    // Bill number prefix match or title match
    supabase
      .from('Bills')
      .select('id, bill_number, title, author')
      .or(`bill_number.ilike.${q.toUpperCase()}%,title.ilike.%${q}%`)
      .order('bill_number', { ascending: true })
      .limit(5),
    // Legislator name match
    supabase
      .from('legislators')
      .select('name, chamber, district')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(4),
  ])

  // Bill suggestions
  if (billsResult.status === 'fulfilled' && !billsResult.value.error) {
    for (const bill of billsResult.value.data || []) {
      suggestions.push({
        type: 'bill',
        label: bill.bill_number,
        subtitle: bill.title?.slice(0, 80),
        url: `/bill/${bill.id}`,
        value: bill.bill_number,
      })
    }
  }

  // Legislator suggestions
  if (legislatorsResult.status === 'fulfilled' && !legislatorsResult.value.error) {
    for (const leg of legislatorsResult.value.data || []) {
      suggestions.push({
        type: 'legislator',
        label: leg.name,
        subtitle: [leg.chamber, leg.district ? `District ${leg.district}` : null]
          .filter(Boolean).join(' · '),
        url: `/legislator/${encodeURIComponent(leg.name)}`,
        value: leg.name,
      })
    }
  }

  // Topic suggestions from common list
  const topicMatches = COMMON_TOPICS.filter(t => t.includes(lower)).slice(0, 4)

  // Also check subjects in Bills table
  const { data: subjectData } = await supabase
    .from('Bills')
    .select('subjects')
    .not('subjects', 'is', null)
    .limit(500)

  const subjectCounts = new Map<string, number>()
  for (const row of subjectData || []) {
    if (!Array.isArray(row.subjects)) continue
    for (const s of row.subjects) {
      const name = s?.subject_name?.trim()
      if (!name) continue
      if (name.toLowerCase().includes(lower)) {
        subjectCounts.set(name, (subjectCounts.get(name) || 0) + 1)
      }
    }
  }

  const sortedSubjects = [...subjectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  for (const [subject, count] of sortedSubjects) {
    suggestions.push({
      type: 'topic',
      label: subject,
      subtitle: `${count} bill${count !== 1 ? 's' : ''}`,
      value: subject,
    })
  }

  // Fill in generic topic suggestions if not enough
  for (const topic of topicMatches) {
    const alreadyAdded = suggestions.some(
      s => s.type === 'topic' && s.label.toLowerCase() === topic
    )
    if (!alreadyAdded && suggestions.filter(s => s.type === 'topic').length < 3) {
      suggestions.push({
        type: 'topic',
        label: topic,
        value: topic,
      })
    }
  }

  // Cap total at 8
  return NextResponse.json({ suggestions: suggestions.slice(0, 8) })
}
