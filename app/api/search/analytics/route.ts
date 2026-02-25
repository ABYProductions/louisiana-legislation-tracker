import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { query, filters, result_count, session_id } = body || {}

    // Don't log empty queries
    if (!query && (!filters || Object.keys(filters).length === 0)) {
      return NextResponse.json({ ok: true })
    }

    const supabase = getSupabaseServer()
    await supabase.from('search_logs').insert({
      query: query || null,
      filters: filters || {},
      result_count: typeof result_count === 'number' ? result_count : null,
      session_id: session_id || null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Non-critical — never fail the user experience over analytics
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
