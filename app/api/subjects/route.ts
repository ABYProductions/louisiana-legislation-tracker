import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 3600

function normalizeName(s: string): string {
  return s
    .split('/')
    .map(part =>
      part.split(' ').map(word =>
        word.length > 0
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : word
      ).join(' ')
    )
    .join('/')
}

export async function GET() {
  const supabase = getSupabaseServer()

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('subjects')
    .not('subjects', 'is', null)
    .limit(3000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts: Record<string, number> = {}

  for (const b of (bills || [])) {
    const subs = b.subjects as any[]
    if (!Array.isArray(subs)) continue
    for (const s of subs) {
      const raw = s?.subject_name?.trim()
      if (!raw) continue
      const normalized = normalizeName(raw)
      counts[normalized] = (counts[normalized] || 0) + 1
    }
  }

  const sorted = Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const maxCount = sorted[0]?.[1] || 1

  const subjects = sorted.map(([name, bill_count]) => ({
    name,
    bill_count,
    pct_of_max: Math.round((bill_count / maxCount) * 100),
  }))

  return NextResponse.json({ subjects, total: subjects.length })
}
