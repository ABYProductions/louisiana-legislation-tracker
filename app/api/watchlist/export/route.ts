import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { normalizePriority } from '@/app/api/watchlist/bills/route'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const folderId = searchParams.get('folder_id')
  const billIdsParam = searchParams.get('bill_ids')

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

  if (folderId) {
    bills = bills.filter(b => b.folder_ids.includes(folderId))
  }
  if (billIdsParam) {
    const ids = billIdsParam.split(',').map(Number).filter(Boolean)
    bills = bills.filter(b => ids.includes(b.bill_id))
  }

  if (bills.length === 0) return NextResponse.json({ bills: [] })

  const billIds = bills.map(b => b.bill_id)
  const { data: billData } = await supabase
    .from('Bills')
    .select('id, bill_number, title, status, author, committee, last_action, last_action_date, summary, summary_status, history')
    .in('id', billIds)

  const billMap = new Map((billData || []).map(b => [b.id, b]))

  const merged = bills.map(ub => {
    const bill = billMap.get(ub.bill_id) || {}
    return {
      bill_id: ub.bill_id,
      notes: ub.notes || null,
      priority: ub.priority,
      added_at: ub.added_at,
      ...bill,
    }
  })

  return NextResponse.json({ bills: merged })
}
