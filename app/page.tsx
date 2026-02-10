import { createClient } from '@supabase/supabase-js'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import BillListWithFilters from '@/app/components/BillListWithFilters'

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
  
  const subjects = [...new Set(
    bills
      .flatMap(b => b.subjects || [])
      .map((s: any) => s.subject_name)
      .filter(Boolean)
  )].sort()

  const authors = [...new Set(
    bills.map(b => b.author).filter(Boolean)
  )].sort()

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section - Louisiana Flag Colors */}
        <section className="relative overflow-hidden bg-[#0C2340] text-white">
          {/* Pelican Pattern Background */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Gold Accent Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FDD023] rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FDD023] rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="max-w-3xl">
              {/* Session Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDD023] text-[#0C2340] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#0C2340] animate-pulse" />
                <span className="text-sm font-bold">2026 Regular Session • Pre-filing</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Louisiana{' '}
                <span className="text-[#FDD023]">Legislation</span>{' '}
                Tracker
              </h1>
              
              <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed max-w-2xl">
                Your comprehensive guide to bills in the Louisiana State Legislature. 
                AI-powered summaries make complex legislation accessible to every citizen of the Pelican State.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a 
                  href="#bills" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FDD023] text-[#0C2340] font-bold hover:bg-[#FFDB4D] transition-colors shadow-lg"
                >
                  Browse Bills
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
                <a 
                  href="/legislators" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-[#FDD023]/50 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Browse Legislators
                </a>
                <a 
                  href="/calendar" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-[#FDD023]/50 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </a>
                <a 
                  href="#bills" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-[#FDD023]/50 hover:bg-white/20 transition-colors"
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
                <div className="text-3xl sm:text-4xl font-bold text-[#FDD023]">{bills.length}</div>
                <div className="text-sm text-blue-200 mt-1">Bills Tracked</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl sm:text-4xl font-bold text-[#FDD023]">
                  {bills.filter(b => b.summary).length}
                </div>
                <div className="text-sm text-blue-200 mt-1">AI Summaries</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl sm:text-4xl font-bold text-[#FDD023]">
                  {authors.length}
                </div>
                <div className="text-sm text-blue-200 mt-1">Legislators</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl sm:text-4xl font-bold text-[#FDD023]">
                  {subjects.length}
                </div>
                <div className="text-sm text-blue-200 mt-1">Subject Areas</div>
              </div>
            </div>
          </div>
          
          {/* Bottom Gold Border */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FDD023] via-[#FFDB4D] to-[#FDD023]" />
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

          <BillListWithFilters 
            initialBills={bills}
            legislators={authors}
            subjects={subjects}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}