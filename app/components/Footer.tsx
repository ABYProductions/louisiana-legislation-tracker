import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#002868] text-white">
      {/* Gold Top Border */}
      <div className="h-1 bg-gradient-to-r from-[#f4c430] via-[#f7d35c] to-[#f4c430]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#f4c430] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#002868]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-white">Louisiana Legislation Tracker</span>
              </div>
            </div>
            <p className="text-blue-200 max-w-md">
              Making Louisiana legislation accessible to every citizen. 
              AI-powered summaries help you understand bills without the legal jargon.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-[#f4c430] mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#bills" className="text-blue-200 hover:text-[#f4c430] transition-colors">
                  Browse Bills
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-blue-200 hover:text-[#f4c430] transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Resources */}
          <div>
            <h3 className="font-semibold text-[#f4c430] mb-4">Official Resources</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://legis.la.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-200 hover:text-[#f4c430] transition-colors"
                >
                  Louisiana Legislature
                </a>
              </li>
              <li>
                <a 
                  href="https://house.louisiana.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-200 hover:text-[#f4c430] transition-colors"
                >
                  House of Representatives
                </a>
              </li>
              <li>
                <a 
                  href="https://senate.la.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-200 hover:text-[#f4c430] transition-colors"
                >
                  Louisiana Senate
                </a>
              </li>
              <li>
                <a 
                  href="https://gov.louisiana.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-200 hover:text-[#f4c430] transition-colors"
                >
                  Governor's Office
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-blue-200">
              © {new Date().getFullYear()} Louisiana Legislation Tracker. 
              Not affiliated with the Louisiana State Legislature.
            </p>
            <p className="text-sm text-blue-200">
              Data sourced from <a href="https://legiscan.com" target="_blank" rel="noopener noreferrer" className="text-[#f4c430] hover:underline">LegiScan</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}