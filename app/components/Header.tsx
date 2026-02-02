'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#002868] shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f4c430] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#002868]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-tight">Louisiana</span>
              <span className="text-sm text-[#f4c430] leading-tight">Legislation Tracker</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#bills" className="text-white/90 hover:text-[#f4c430] font-medium transition-colors">
              All Bills
            </Link>
            <Link href="/about" className="text-white/90 hover:text-[#f4c430] font-medium transition-colors">
              About
            </Link>
            <a 
              href="https://legis.la.gov" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/90 hover:text-[#f4c430] font-medium transition-colors"
            >
              Official Legislature
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <div className="flex flex-col gap-4">
              <Link 
                href="/#bills" 
                className="text-white/90 hover:text-[#f4c430] font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                All Bills
              </Link>
              <Link 
                href="/about" 
                className="text-white/90 hover:text-[#f4c430] font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <a 
                href="https://legis.la.gov" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/90 hover:text-[#f4c430] font-medium transition-colors"
              >
                Official Legislature
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}