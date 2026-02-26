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

export interface Folder {
  id: string
  user_id: string
  name: string
  color: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  bill_count: number
}

export async function GET() {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: folders, error: fErr }, { data: userBills, error: bErr }] = await Promise.all([
    supabase.from('user_folders').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
    supabase.from('user_bills').select('id, folder_ids').eq('user_id', user.id),
  ])

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

  const bills = userBills || []
  const result: Folder[] = (folders || []).map(f => ({
    ...f,
    bill_count: bills.filter(b => Array.isArray(b.folder_ids) && b.folder_ids.includes(f.id)).length,
  }))

  return NextResponse.json({ folders: result, total_bills: bills.length })
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = (body.name as string)?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (name.length > 50) return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_folders')
    .insert({
      user_id: user.id,
      name,
      color: body.color || '#C4922A',
      description: body.description || null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ folder: { ...data, bill_count: 0 } })
}

export async function PATCH(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) {
    const name = (body.name as string).trim()
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    if (name.length > 50) return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 })
    updates.name = name
  }
  if (body.color !== undefined) updates.color = body.color
  if (body.description !== undefined) updates.description = body.description || null
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order

  const { data, error } = await supabase
    .from('user_folders')
    .update(updates)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ folder: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await getAuthClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Remove this folder_id from all user_bills
  const { data: bills } = await supabase
    .from('user_bills')
    .select('id, folder_ids')
    .eq('user_id', user.id)
    .contains('folder_ids', [body.id])

  for (const bill of bills || []) {
    const newFolderIds = (bill.folder_ids as string[]).filter((fid: string) => fid !== body.id)
    await supabase.from('user_bills').update({ folder_ids: newFolderIds }).eq('id', bill.id)
  }

  const { error } = await supabase
    .from('user_folders')
    .delete()
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
