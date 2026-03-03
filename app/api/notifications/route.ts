import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const revalidate = 0

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function GET(_req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ notifications: [], unread_count: 0 })
  }

  const serverSupabase = getSupabaseServer()
  const { data, error } = await serverSupabase
    .from('notifications')
    .select(`
      id, type, title, body, is_read, created_at, bill_id,
      Bills!inner(bill_number, title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    // Table may not exist yet
    return NextResponse.json({ notifications: [], unread_count: 0 })
  }

  const notifications = (data ?? []).map((n: any) => ({
    id:          n.id,
    type:        n.type,
    title:       n.title,
    body:        n.body,
    is_read:     n.is_read,
    created_at:  n.created_at,
    bill_id:     n.bill_id,
    bill_number: n.Bills?.bill_number ?? null,
    bill_title:  n.Bills?.title ?? null,
  }))

  return NextResponse.json({
    notifications,
    unread_count: notifications.filter((n: any) => !n.is_read).length,
  })
}
