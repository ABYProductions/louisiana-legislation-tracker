import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 1800

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subject: string }> }
) {
  const { subject: rawParam } = await params
  const subject = decodeURIComponent(rawParam)
  const subjectLower = subject.toLowerCase()

  const supabase = getSupabaseServer()

  const { data: allBills, error } = await supabase
    .from('Bills')
    .select('id, bill_number, title, status, author, committee, last_action, last_action_date, next_event, subjects')
    .not('subjects', 'is', null)
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matching = (allBills || []).filter(b => {
    const subs = b.subjects as any[]
    if (!Array.isArray(subs)) return false
    return subs.some(s => {
      const raw = s?.subject_name
      if (!raw) return false
      return (
        raw.toLowerCase() === subjectLower ||
        normalizeName(raw).toLowerCase() === subjectLower
      )
    })
  })

  const bills = matching.slice(0, 24).map(b => ({
    id: b.id,
    bill_number: b.bill_number,
    title: b.title,
    status: b.status,
    sponsor: b.author,
    committee: b.committee,
    last_action: b.last_action,
    last_action_date: b.last_action_date,
    next_event: b.next_event,
  }))

  return NextResponse.json({ bills, total: matching.length })
}
