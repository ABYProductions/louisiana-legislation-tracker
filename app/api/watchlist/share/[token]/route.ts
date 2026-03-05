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

  const { data: share } = await supabase
    .from('shared_watchlists')
    .select('id, user_id, title, share_type, folder_id, created_at')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (!share) return NextResponse.json({ error: 'Share not found or no longer active' }, { status: 404 })

  // Count bills in this share
  let countQuery = supabase
    .from('user_bills')
    .select('bill_id', { count: 'exact', head: true })
    .eq('user_id', share.user_id)

  if (share.share_type === 'folder' && share.folder_id) {
    countQuery = countQuery.contains('folder_ids', [share.folder_id])
  }

  const { count } = await countQuery

  return NextResponse.json({
    title: share.title,
    share_type: share.share_type,
    bill_count: count ?? 0,
    created_at: share.created_at,
  })
}
