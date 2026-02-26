import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
}

export async function GET(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const folderId = searchParams.get('folder_id')
  const priorityFilter = searchParams.get('priority')
  const sort = searchParams.get('sort') || 'added_at'

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

  if (bills.length === 0) return NextResponse.json({ bills: [] })

  const billIds = bills.map(b => b.bill_id)
  const { data: billData, error: bErr } = await supabase
    .from('Bills')
    .select('id, bill_number, title, description, status, author, body, current_body, committee, last_action, last_action_date, summary, summary_status, subjects, next_event, history, pdf_url')
    .in('id', billIds)

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  const billMap = new Map((billData || []).map(b => [b.id, b]))

  let merged: WatchedBillRecord[] = bills.map(ub => {
    const bill = billMap.get(ub.bill_id) || {}
    return {
      user_bill_id: ub.id,
      bill_id: ub.bill_id,
      added_at: ub.added_at,
      last_viewed_at: ub.last_viewed_at,
      notes: ub.notes || null,
      priority: ub.priority,
      folder_ids: ub.folder_ids,
      ...bill,
    } as WatchedBillRecord
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
    if (sort === 'last_action') {
      return (b.last_action_date || '').localeCompare(a.last_action_date || '')
    }
    // Default: added_at desc
    return (b.added_at || '').localeCompare(a.added_at || '')
  })

  return NextResponse.json({ bills: merged })
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
