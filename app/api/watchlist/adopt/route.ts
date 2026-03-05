import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServiceRole } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-log'

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { share_token, mode = 'merge' } = body
  if (!share_token) return NextResponse.json({ error: 'share_token required' }, { status: 400 })
  if (mode !== 'merge' && mode !== 'replace') return NextResponse.json({ error: 'mode must be merge or replace' }, { status: 400 })

  const admin = getSupabaseServiceRole()

  // Fetch the share record
  const { data: share } = await admin
    .from('shared_watchlists')
    .select('id, user_id, share_type, folder_id')
    .eq('share_token', share_token)
    .eq('is_active', true)
    .single()

  if (!share) return NextResponse.json({ error: 'Share not found or no longer active' }, { status: 404 })

  // Get bill IDs from the owner's watchlist
  let ownerBillsQuery = admin
    .from('user_bills')
    .select('bill_id')
    .eq('user_id', share.user_id)

  if (share.share_type === 'folder' && share.folder_id) {
    ownerBillsQuery = ownerBillsQuery.contains('folder_ids', [share.folder_id])
  }

  const { data: ownerBills } = await ownerBillsQuery
  const billIds = (ownerBills || []).map((b: { bill_id: number }) => b.bill_id)

  if (billIds.length === 0) {
    return NextResponse.json({ success: true, added: 0, skipped: 0, mode })
  }

  let added = 0
  let skipped = 0

  if (mode === 'replace') {
    // Remove all current user bills, then insert all share bills
    await supabase.from('user_bills').delete().eq('user_id', user.id)
    const inserts = billIds.map((bill_id: number) => ({
      user_id: user.id,
      bill_id,
      added_at: new Date().toISOString(),
    }))
    const { data: inserted } = await supabase.from('user_bills').insert(inserts).select('bill_id')
    added = inserted?.length ?? billIds.length
  } else {
    // Merge — only add bills not already tracked
    const { data: existing } = await supabase
      .from('user_bills')
      .select('bill_id')
      .eq('user_id', user.id)
    const existingIds = new Set((existing || []).map((b: { bill_id: number }) => b.bill_id))
    const toAdd = billIds.filter((id: number) => !existingIds.has(id))
    skipped = billIds.length - toAdd.length
    if (toAdd.length > 0) {
      const inserts = toAdd.map((bill_id: number) => ({
        user_id: user.id,
        bill_id,
        added_at: new Date().toISOString(),
      }))
      const { data: inserted } = await supabase.from('user_bills').insert(inserts).select('bill_id')
      added = inserted?.length ?? toAdd.length
    }
  }

  await logActivity(
    user.id,
    'watchlist_adopted',
    `Adopted shared watchlist (token: ${share_token}, added: ${added}, mode: ${mode})`
  )

  return NextResponse.json({ success: true, added, skipped, mode })
}
