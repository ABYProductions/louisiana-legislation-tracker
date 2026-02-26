import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 1800

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bill_number: string }> }
) {
  const { bill_number } = await params
  const billNumber = decodeURIComponent(bill_number).toUpperCase()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('news_articles')
    .select('id, title, description, url, source_name, source_id, published_at, relevance_score, industry_tags, is_breaking')
    .contains('related_bill_numbers', [billNumber])
    .order('published_at', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ articles: data || [], bill_number: billNumber })
}
