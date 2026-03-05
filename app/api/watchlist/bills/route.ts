import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeBillIndicators, hasUrgentIndicator } from '@/lib/bill-indicators'
import type { BillIndicator } from '@/lib/bill-indicators'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low'

export function normalizePriority(raw: unknown): PriorityLevel {
  if (typeof raw === 'boolean') return raw ? 'high' : 'normal'
  if (typeof raw === 'string' && ['critical', 'high', 'normal', 'low'].includes(raw)) {
    return raw as PriorityLevel
  }
  return 'normal'
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  critical: 1, high: 2, normal: 3, low: 4,
}

export interface WatchedBillRecord {
  user_bill_id: string
  bill_id: number
  added_at: string
  last_viewed_at: string | null
  notes: string | null
  priority: PriorityLevel
  folder_ids: string[]
  bill_number: string
  title: string
  description: string | null
  status: string | null
  author: string | null
  body: string | null
  current_body: string | null
  committee: string | null
  last_action: string | null
  last_action_date: string | null
  summary: string | null
  summary_status: string | null
  subjects: { subject_name: string }[] | null
  next_event: unknown | null
  history: { date: string; action: string }[] | null
  pdf_url: string | null
  amendments: unknown | null
  calendar: unknown | null
  votes: unknown | null
  indicators: BillIndicator[]
}

export interface WatchlistSummary {
  total: number
  withUrgentIndicators: number
  withAnyIndicators: number
  recentActivityCount: number
  lastComputedAt: string
}

export async function GET(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const folderId = searchParams.get('folder_id')
  const priorityFilter = searchParams.get('priority')
  const sort = searchParams.get('sort') || 'recent_activity'

  const { data: userBills, error: ubErr } = await supabase
    .from('user_bills')
    .select('*')
    .eq('user_id', user.id)

  if (ubErr) return NextResponse.json({ error: ubErr.message }, { status: 500 })

  let bills = (userBills || []).map(ub => ({
    ...ub,
    priority: normalizePriority(ub.priority),
    folder_ids: Array.isArray(ub.folder_ids) ? ub.folder_ids : [],
  }))

  // Filter by folder
  if (folderId) {
    bills = bills.filter(b => b.folder_ids.includes(folderId))
  }

  // Filter by priority
  if (priorityFilter && ['critical', 'high', 'normal', 'low'].includes(priorityFilter)) {
    bills = bills.filter(b => b.priority === priorityFilter)
  }

  if (bills.length === 0) {
    return NextResponse.json({
      bills: [],
      summary: {
        total: 0,
        withUrgentIndicators: 0,
        withAnyIndicators: 0,
        recentActivityCount: 0,
        lastComputedAt: new Date().toISOString(),
      } satisfies WatchlistSummary,
    })
  }

  const billIds = bills.map(b => b.bill_id)
  const { data: billData, error: bErr } = await supabase
    .from('Bills')
    .select('id, bill_number, title, description, status, author, body, current_body, committee, last_action, last_action_date, summary, summary_status, subjects, next_event, history, pdf_url, amendments, calendar, votes')
    .in('id', billIds)

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  const billMap = new Map((billData || []).map(b => [b.id, b]))

  const recentThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  let merged: WatchedBillRecord[] = bills.map(ub => {
    const bill = billMap.get(ub.bill_id) || {}
    const base = {
      user_bill_id: ub.id,
      bill_id: ub.bill_id,
      added_at: ub.added_at,
      last_viewed_at: ub.last_viewed_at,
      notes: ub.notes || null,
      priority: ub.priority,
      folder_ids: ub.folder_ids,
      ...bill,
    } as Omit<WatchedBillRecord, 'indicators'>

    const indicators = computeBillIndicators(
      {
        status: base.status,
        last_action: base.last_action,
        last_action_date: base.last_action_date,
        history: base.history,
        amendments: base.amendments,
        calendar: base.calendar,
        votes: base.votes,
      },
      {
        priority: base.priority,
        added_at: base.added_at,
      }
    )

    return { ...base, indicators } as WatchedBillRecord
  })

  // Sort
  merged.sort((a, b) => {
    if (sort === 'priority') {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pd !== 0) return pd
    }
    if (sort === 'bill_number') {
      return (a.bill_number || '').localeCompare(b.bill_number || '')
    }
    if (sort === 'last_action' || sort === 'recent_activity') {
      return (b.last_action_date || '').localeCompare(a.last_action_date || '')
    }
    if (sort === 'added_at') {
      return (b.added_at || '').localeCompare(a.added_at || '')
    }
    // Default: recent_activity
    return (b.last_action_date || '').localeCompare(a.last_action_date || '')
  })

  // Compute summary
  const summary: WatchlistSummary = {
    total: merged.length,
    withUrgentIndicators: merged.filter(b => hasUrgentIndicator(b.indicators)).length,
    withAnyIndicators: merged.filter(b => b.indicators.length > 0).length,
    recentActivityCount: merged.filter(b => {
      if (!b.last_action_date) return false
      try {
        const d = new Date(b.last_action_date + 'T00:00:00')
        return d >= recentThreshold
      } catch { return false }
    }).length,
    lastComputedAt: new Date().toISOString(),
  }

  return NextResponse.json({ bills: merged, summary })
}

export async function PATCH(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.bill_id) return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.notes !== undefined) updates.notes = body.notes || null
  if (body.priority !== undefined) {
    const p = normalizePriority(body.priority)
    updates.priority = p
  }
  if (body.folder_ids !== undefined) {
    updates.folder_ids = Array.isArray(body.folder_ids) ? body.folder_ids : []
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_bills')
    .update(updates)
    .eq('bill_id', body.bill_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    user_bill: { ...data, priority: normalizePriority(data.priority) },
  })
}
