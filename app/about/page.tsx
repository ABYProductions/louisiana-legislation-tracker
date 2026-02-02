import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-[#002868] text-white py-16 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            About <span className="text-[#f4c430]">Louisiana Legislation Tracker</span>
          </h1>
          <p className="text-xl text-blue-200">
            Making state legislation accessible to every Louisiana citizen
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#f4c430] via-[#f7d35c] to-[#f4c430]" />
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mission */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#002868] mb-4">Our Mission</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            The Louisiana Legislation Tracker was created to bridge the gap between the State Capitol 
            and the citizens it serves. We believe every Louisianan deserves to understand the laws 
            being proposed and passed in their name, without needing a law degree to do so.
          </p>
          <p className="text-slate-700 leading-relaxed">
            By combining official legislative data with AI-powered plain-language summaries, we transform 
            complex legal text into clear, actionable information that empowers citizens to engage with 
            their government.
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#002868] mb-6">How It Works</h2>
          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#002868] flex items-center justify-center text-[#f4c430] font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Data Collection</h3>
                <p className="text-slate-600">
                  We automatically sync with the Louisiana State Legislature daily, pulling in every 
                  new bill, amendment, and status update as they happen.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#002868] flex items-center justify-center text-[#f4c430] font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">AI Analysis</h3>
                <p className="text-slate-600">
                  Each bill is analyzed by advanced AI to produce plain-language summaries covering 
                  the executive summary, affected statutes, impacted parties, and potential impact.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#002868] flex items-center justify-center text-[#f4c430] font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Easy Access</h3>
                <p className="text-slate-600">
                  Search by keyword, filter by author, subject, or status, and dive deep into any 
                  bill that interests you. Direct links to official documents are always provided.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#002868] mb-4">Data Sources</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            All legislative data is sourced from official public records through the LegiScan API, 
            which aggregates information directly from the Louisiana State Legislature.
          </p>
          <p className="text-slate-700 leading-relaxed mb-6">
            AI summaries are generated using Claude by Anthropic, designed to be accurate, unbiased, 
            and accessible to general audiences.
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="https://legis.la.gov" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#002868] text-white rounded-lg hover:bg-[#003d99] transition-colors"
            >
              Louisiana Legislature
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a 
              href="https://legiscan.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              LegiScan
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#f4c430]/20 border border-[#f4c430] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#002868] mb-4">Important Disclaimer</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            This website is an independent civic project and is <strong>not affiliated with, endorsed by, 
            or connected to the Louisiana State Legislature</strong>, any state agency, or any government entity.
          </p>
          <p className="text-slate-700 leading-relaxed">
            While we strive for accuracy, AI-generated summaries are provided for informational purposes only 
            and should not be considered legal advice. Always refer to official legislative documents for 
            authoritative information.
          </p>
        </div>

        {/* Get Involved */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-[#002868] mb-4">Get Involved</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Louisiana Legislation Tracker is a civic technology project aimed at increasing government 
            transparency and citizen engagement. We welcome feedback and suggestions for improvement.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#002868] text-white rounded-xl font-semibold hover:bg-[#003d99] transition-colors"
          >
            Start Exploring Bills
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  )
}
