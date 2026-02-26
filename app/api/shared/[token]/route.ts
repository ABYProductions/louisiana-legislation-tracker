import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const supabase = getSupabaseServiceRole()

  // Fetch the share record
  const { data: share, error: shareErr } = await supabase
    .from('shared_watchlists')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (shareErr || !share) {
    return NextResponse.json({ error: 'Share not found or no longer active' }, { status: 404 })
  }

  // Increment view_count
  await supabase
    .from('shared_watchlists')
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq('id', share.id)

  // Fetch user_bills for this share (no user_id exposure — filter by owner)
  let userBillsQuery = supabase
    .from('user_bills')
    .select('bill_id, added_at, folder_ids')
    .eq('user_id', share.user_id)

  if (share.share_type === 'folder' && share.folder_id) {
    // PostgREST: filter where folder_ids contains the folder
    userBillsQuery = userBillsQuery.contains('folder_ids', [share.folder_id])
  }

  const { data: userBills } = await userBillsQuery

  if (!userBills || userBills.length === 0) {
    return NextResponse.json({
      share: {
        title: share.title,
        share_type: share.share_type,
        created_at: share.created_at,
        view_count: share.view_count,
      },
      bills: [],
    })
  }

  const billIds = userBills.map(b => b.bill_id)

  const { data: billData } = await supabase
    .from('Bills')
    .select('id, bill_number, title, status, author, committee, last_action, last_action_date, next_event, history, summary, summary_status, pdf_url')
    .in('id', billIds)

  // Truncate summary to 300 chars for shared view, never expose notes or user_id
  const bills = (billData || []).map(bill => ({
    id: bill.id,
    bill_number: bill.bill_number,
    title: bill.title,
    status: bill.status,
    author: bill.author,
    committee: bill.committee,
    last_action: bill.last_action,
    last_action_date: bill.last_action_date,
    next_event: bill.next_event,
    history: bill.history,
    summary: bill.summary ? bill.summary.slice(0, 300) + (bill.summary.length > 300 ? '…' : '') : null,
    summary_status: bill.summary_status,
    pdf_url: bill.pdf_url,
  }))

  return NextResponse.json({
    share: {
      title: share.title,
      share_type: share.share_type,
      created_at: share.created_at,
      view_count: share.view_count,
      bill_count: bills.length,
    },
    bills,
  })
}
