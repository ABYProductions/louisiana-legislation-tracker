import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function LegislatorsPage() {
  const { data: bills, error } = await supabase
    .from('Bills')
    .select('author')
    .order('author', { ascending: true })

  if (error) {
    console.error('Error fetching legislators:', error)
    return <div>Error loading legislators</div>
  }

  const legislatorMap = new Map<string, number>()
  
  bills?.forEach(bill => {
    if (bill.author) {
      const count = legislatorMap.get(bill.author) || 0
      legislatorMap.set(bill.author, count + 1)
    }
  })

  const legislators = Array.from(legislatorMap.entries())
    .map(([name, billCount]) => ({ name, billCount }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-[#0C2340] hover:text-[#1a3a5c] mb-4 font-medium"
            >
              ← Back to All Bills
            </Link>
            
            <h1 className="text-4xl font-bold text-[#0C2340] mb-3">
              Louisiana Legislators
            </h1>
            <p className="text-slate-600 text-lg">
              Browse {legislators.length} legislators who have filed bills in the 2026 Regular Session
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-3xl font-bold text-[#0C2340]">{legislators.length}</div>
              <div className="text-sm text-slate-600 mt-1">Total Legislators</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-3xl font-bold text-[#0C2340]">
                {legislators.reduce((sum, l) => sum + l.billCount, 0)}
              </div>
              <div className="text-sm text-slate-600 mt-1">Total Bills Filed</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-3xl font-bold text-[#0C2340]">
                {Math.round(legislators.reduce((sum, l) => sum + l.billCount, 0) / legislators.length)}
              </div>
              <div className="text-sm text-slate-600 mt-1">Avg Bills/Legislator</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-3xl font-bold text-[#0C2340]">
                {Math.max(...legislators.map(l => l.billCount))}
              </div>
              <div className="text-sm text-slate-600 mt-1">Most Bills Filed</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-[#0C2340] mb-6">All Legislators</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {legislators.map((legislator) => (
                <Link
                  key={legislator.name}
                  href={`/legislator/${encodeURIComponent(legislator.name)}`}
                  className="group block p-4 rounded-xl border border-slate-200 hover:border-[#0C2340] hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 group-hover:text-[#0C2340] transition-colors">
                        {legislator.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {legislator.billCount} {legislator.billCount === 1 ? 'bill' : 'bills'} filed
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-10 h-10 rounded-full bg-[#0C2340] flex items-center justify-center text-white font-bold">
                        {legislator.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}