import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-[#0C2340] border-b border-[#FDD023]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FDD023] flex items-center justify-center">
              <span className="text-[#0C2340] font-bold text-xl">⚖️</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Louisiana</h1>
              <p className="text-[#FDD023] text-xs">Legislation Tracker</p>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link 
              href="/" 
              className="text-white hover:text-[#FDD023] font-medium text-sm transition-colors"
            >
              All Bills
            </Link>
            <Link 
              href="/about" 
              className="text-white hover:text-[#FDD023] font-medium text-sm transition-colors"
            >
              About
            </Link>
            <a 
              href="https://legis.la.gov" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-[#FDD023] font-medium text-sm transition-colors"
            >
              Official Legislature
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}