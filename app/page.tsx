import { getSupabaseServer } from '@/lib/supabase'
import TopBar from '@/app/components/TopBar'
import CommandHeader from '@/app/components/CommandHeader'
import Dashboard from '@/app/components/Dashboard'
import WelcomeBanner from '@/app/components/WelcomeBanner'
import Footer from '@/app/components/Footer'
import type { SearchFilterState } from '@/app/components/SearchFilters'

// Always fetch fresh data — bill status changes every few hours during session
export const revalidate = 0

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  // Parse initial values from URL for SSR
  const initialQuery = (params.q as string) || ''
  const rawSubject = params.subject
  const rawBillType = params.bill_type

  const initialFilters: SearchFilterState = {
    chamber: (params.chamber as string) || '',
    status: (params.status as string) || '',
    committee: (params.committee as string) || '',
    sponsor: (params.sponsor as string) || '',
    subject: rawSubject
      ? Array.isArray(rawSubject)
        ? rawSubject
        : [rawSubject]
      : [],
    bill_type: rawBillType
      ? Array.isArray(rawBillType)
        ? rawBillType
        : [rawBillType]
      : [],
    has_event: (params.has_event as string) || '',
    date_from: (params.date_from as string) || '',
    date_to: (params.date_to as string) || '',
    sort: (params.sort as string) || 'date_desc',
  }

  const supabase = getSupabaseServer()

  const [
    { count: totalCount },
    { count: summaryCount },
    { data: authorData },
  ] = await Promise.all([
    supabase.from('Bills').select('*', { count: 'exact', head: true }),
    supabase
      .from('Bills')
      .select('*', { count: 'exact', head: true })
      .not('summary', 'is', null)
      .eq('summary_status', 'complete'),
    supabase
      .from('Bills')
      .select('author')
      .not('author', 'is', null)
      .limit(2000),
  ])

  const legislatorCount = new Set(
    (authorData || []).map((r: { author: string | null }) => r.author).filter(Boolean)
  ).size

  return (
    <>
      <TopBar />
      <CommandHeader
        totalCount={totalCount || 0}
        summaryCount={summaryCount || 0}
        legislatorCount={legislatorCount}
        initialQuery={initialQuery}
      />
      <WelcomeBanner />
      <main style={{ background: 'var(--cream)', minHeight: '100vh' }}>
        <div style={{
          maxWidth: 'var(--width-content)',
          margin: '0 auto',
          padding: '0 var(--space-6)',
        }}>
          <Dashboard initialQuery={initialQuery} initialFilters={initialFilters} />
        </div>
      </main>
      <Footer />
    </>
  )
}
