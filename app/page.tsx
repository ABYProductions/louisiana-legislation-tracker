import { createClient } from '@supabase/supabase-js'
import BillCard from './components/BillCard'
import BillListClient from './components/BillListClient'

async function getBills() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data, error } = await supabase
    .from('Bills')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching bills:', JSON.stringify(error, null, 2))
    return []
  }
  
  return data || []
}

export default async function Home() {
  const bills = await getBills()
  
  // Extract unique statuses and subjects for filters
  const statuses = [...new Set(bills.map(b => b.status).filter(Boolean))]
  const subjects = [...new Set(
    bills
      .flatMap(b => b.subjects || [])
      .map((s: any) => s.subject_name)
      .filter(Boolean)
  )].sort()

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500 rounded-full filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-white/90">2026 Regular Session • Pre-filing</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
              Louisiana Legislation,{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl">
              AI-powered summaries transform complex legislative text into clear, 
              actionable insights. Track bills that matter to you without the legal jargon.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a 
                href="#bills" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors shadow-lg shadow-white/20"
              >
                Browse Bills
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <a 
                href="/search" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold border border-white/20 hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Bills
              </a>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-white">{bills.length}</div>
              <div className="text-sm text-slate-400 mt-1">Bills Tracked</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-white">
                {bills.filter(b => b.summary).length}
              </div>
              <div className="text-sm text-slate-400 mt-1">AI Summaries</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-white">
                {[...new Set(bills.map(b => b.author).filter(Boolean))].length}
              </div>
              <div className="text-sm text-slate-400 mt-1">Authors</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-white">
                {subjects.length}
              </div>
              <div className="text-sm text-slate-400 mt-1">Subject Areas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bills Section */}
      <section id="bills" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">All Bills</h2>
            <p className="text-slate-500 mt-1">
              Browse and filter {bills.length} bills from the 2026 Regular Session
            </p>
          </div>
        </div>

        <BillListClient 
          bills={bills} 
          availableStatuses={statuses}
          availableSubjects={subjects}
        />
      </section>
    </main>
  )
}
