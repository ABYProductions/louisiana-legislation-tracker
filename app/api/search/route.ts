import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

export const revalidate = 0

export interface SearchResult {
  id: number
  bill_number: string
  title: string
  status: string | null
  author: string | null
  committee: string | null
  bill_type: string | null
  subjects: any[] | null
  summary: string | null
  digest: string | null
  abstract: string | null
  description: string | null
  last_action: string | null
  last_action_date: string | null
  next_event: any | null
  session_year: number | null
  pdf_url: string | null
  extraction_quality: string | null
  summary_status: string | null
  body: string | null
  rank: number
  headline: string | null
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  total_pages: number
  query: string | null
  filters_applied: Record<string, string | boolean>
  execution_ms: number
  error?: string
  fallback?: boolean
}

export async function GET(req: NextRequest): Promise<NextResponse<SearchResponse>> {
  const t0 = Date.now()
  const { searchParams } = req.nextUrl

  const q          = searchParams.get('q')?.trim() || null
  const chamber    = searchParams.get('chamber') || null
  const status     = searchParams.get('status') || null
  const committee  = searchParams.get('committee') || null
  const sponsor    = searchParams.get('sponsor') || null
  const subject    = searchParams.get('subject') || null
  const billType   = searchParams.get('bill_type') || null
  const hasEvent   = searchParams.get('has_event')
  const dateFrom   = searchParams.get('date_from') || null
  const dateTo     = searchParams.get('date_to') || null
  const billNumber = searchParams.get('bill_number')?.trim().toUpperCase() || null
  const sort       = searchParams.get('sort') || (q ? 'relevance' : 'date_desc')
  const pageRaw    = parseInt(searchParams.get('page') || '1', 10)
  const limitRaw   = parseInt(searchParams.get('limit') || '25', 10)

  const page  = Math.max(1, isNaN(pageRaw) ? 1 : pageRaw)
  const limit = Math.min(100, Math.max(1, isNaN(limitRaw) ? 25 : limitRaw))

  const hasEventBool = hasEvent === 'true' ? true : hasEvent === 'false' ? false : null

  const filtersApplied: Record<string, string | boolean> = {}
  if (q)           filtersApplied.q = q
  if (chamber)     filtersApplied.chamber = chamber
  if (status)      filtersApplied.status = status
  if (committee)   filtersApplied.committee = committee
  if (sponsor)     filtersApplied.sponsor = sponsor
  if (subject)     filtersApplied.subject = subject
  if (billType)    filtersApplied.bill_type = billType
  if (hasEventBool !== null) filtersApplied.has_event = hasEventBool
  if (dateFrom)    filtersApplied.date_from = dateFrom
  if (dateTo)      filtersApplied.date_to = dateTo
  if (billNumber)  filtersApplied.bill_number = billNumber

  const supabase = getSupabaseServer()

  // Try RPC first (requires migration 001-full-text-search.sql to have been run)
  try {
    const rpcParams: Record<string, unknown> = {
      page_number: page,
      page_size: limit,
      sort_by: sort,
      filter_session: 2026,
    }
    if (q)                    rpcParams.query_text = q
    if (chamber)              rpcParams.filter_chamber = chamber
    if (status)               rpcParams.filter_status = status
    if (committee)            rpcParams.filter_committee = committee
    if (sponsor)              rpcParams.filter_sponsor = sponsor
    if (subject)              rpcParams.filter_subject = subject
    if (billType)             rpcParams.filter_bill_type = billType
    if (hasEventBool !== null) rpcParams.filter_has_upcoming_event = hasEventBool
    if (dateFrom)             rpcParams.filter_date_from = dateFrom
    if (dateTo)               rpcParams.filter_date_to = dateTo
    if (billNumber)           rpcParams.filter_bill_number = billNumber

    const { data, error } = await supabase.rpc('search_bills', rpcParams)

    if (error) throw error

    const rows = (data as any[]) || []
    const total = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0
    const results: SearchResult[] = rows.map((r: any) => ({
      id:                r.id,
      bill_number:       r.bill_number,
      title:             r.title,
      status:            r.status,
      author:            r.author,
      committee:         r.committee,
      bill_type:         r.bill_type,
      subjects:          r.subjects,
      summary:           r.summary,
      digest:            r.digest,
      abstract:          r.abstract,
      description:       r.description,
      last_action:       r.last_action,
      last_action_date:  r.last_action_date,
      next_event:        r.next_event,
      session_year:      r.session_year,
      pdf_url:           r.pdf_url,
      extraction_quality: r.extraction_quality,
      summary_status:    r.summary_status,
      body:              r.body,
      rank:              r.rank ?? 0,
      headline:          r.headline ?? null,
    }))

    return NextResponse.json({
      results,
      total,
      page,
      total_pages: Math.ceil(total / limit),
      query: q,
      filters_applied: filtersApplied,
      execution_ms: Date.now() - t0,
    })
  } catch (rpcErr: any) {
    // RPC not available (migration not run yet) — fall back to ILIKE search
    console.warn('[search] RPC unavailable, using fallback:', rpcErr.message ?? rpcErr)
  }

  // ── Fallback: simple ilike + filter query ──────────────────────────────────
  try {
    let query = supabase
      .from('Bills')
      .select('id, bill_number, title, status, author, committee, bill_type, subjects, summary, digest, abstract, description, last_action, last_action_date, next_event, session_year, pdf_url, extraction_quality, summary_status, body', { count: 'exact' })

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,bill_number.ilike.%${q}%,author.ilike.%${q}%,summary.ilike.%${q}%,digest.ilike.%${q}%,abstract.ilike.%${q}%`
      )
    }
    if (chamber) {
      if (chamber.toLowerCase() === 'house') {
        query = query.or('bill_number.ilike.HB%,bill_number.ilike.HR%,bill_number.ilike.HCR%')
      } else if (chamber.toLowerCase() === 'senate') {
        query = query.or('bill_number.ilike.SB%,bill_number.ilike.SR%,bill_number.ilike.SCR%')
      }
    }
    if (status)     query = query.ilike('status', status)
    if (committee)  query = query.ilike('committee', `%${committee}%`)
    if (sponsor)    query = query.ilike('author', `%${sponsor}%`)
    if (billType)   query = query.ilike('bill_type', billType)
    if (dateFrom)      query = query.gte('last_action_date', dateFrom)
    if (dateTo)        query = query.lte('last_action_date', dateTo)
    if (billNumber)    query = query.ilike('bill_number', `${billNumber}%`)

    const sortMap: Record<string, { col: string; asc: boolean }> = {
      date_desc:   { col: 'last_action_date', asc: false },
      date_asc:    { col: 'last_action_date', asc: true  },
      bill_number: { col: 'bill_number',       asc: true  },
      relevance:   { col: 'last_action_date', asc: false },
    }
    const s = sortMap[sort] || sortMap.date_desc
    query = query.order(s.col, { ascending: s.asc, nullsFirst: false })

    query = query.range((page - 1) * limit, page * limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    let rows = (data as any[]) || []

    // Apply subject filter in JS (fallback mode only)
    if (subject) {
      const target = subject.toLowerCase()
      rows = rows.filter((b: any) =>
        Array.isArray(b.subjects) &&
        b.subjects.some((s: any) =>
          typeof s?.subject_name === 'string' &&
          s.subject_name.toLowerCase().includes(target)
        )
      )
    }

    const results: SearchResult[] = rows.map((r: any) => ({
      id:                r.id,
      bill_number:       r.bill_number,
      title:             r.title,
      status:            r.status,
      author:            r.author,
      committee:         r.committee,
      bill_type:         r.bill_type,
      subjects:          r.subjects,
      summary:           r.summary,
      digest:            r.digest,
      abstract:          r.abstract,
      description:       r.description,
      last_action:       r.last_action,
      last_action_date:  r.last_action_date,
      next_event:        r.next_event,
      session_year:      r.session_year,
      pdf_url:           r.pdf_url,
      extraction_quality: r.extraction_quality,
      summary_status:    r.summary_status,
      body:              r.body,
      rank:              0,
      headline:          null,
    }))

    return NextResponse.json({
      results,
      total: count ?? results.length,
      page,
      total_pages: Math.ceil((count ?? results.length) / limit),
      query: q,
      filters_applied: filtersApplied,
      execution_ms: Date.now() - t0,
      fallback: true,
    })
  } catch (err: any) {
    console.error('[search] Fallback query failed:', err)
    return NextResponse.json({
      results: [],
      total: 0,
      page,
      total_pages: 0,
      query: q,
      filters_applied: filtersApplied,
      execution_ms: Date.now() - t0,
      error: 'Search temporarily unavailable',
    })
  }
}
