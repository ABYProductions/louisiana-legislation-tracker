'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Scroll lock when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Escape key closes mobile nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const links = [
    { href: '/#bills', label: 'All Bills' },
    { href: '/news', label: 'News' },
    { href: '/legislators', label: 'Legislators' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/about', label: 'About' },
  ]

  return (
    <>
      {/* Top utility bar */}
      <div style={{
        background: 'var(--navy)',
        padding: '9px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.08em',
        }}>
          Baton Rouge, Louisiana · 2026 Regular Legislative Session
        </span>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'var(--gold)',
          fontWeight: 500,
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            background: 'var(--gold)',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          Session opens March 10, 2026
        </span>
      </div>

      {/* Main nav */}
      <header style={{
        background: 'var(--cream)',
        borderBottom: '1px solid var(--border)',
        padding: '0 48px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '27px', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.02em', lineHeight: 1 }}>
            SessionSource
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, marginTop: '2px' }}>
            Louisiana Legislature
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="desktop-nav" aria-label="Main navigation" style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: pathname === href ? 'var(--gold)' : 'var(--text-primary)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                fontWeight: pathname === href ? 600 : 400,
                borderBottom: pathname === href ? '2px solid var(--gold)' : '2px solid transparent',
                paddingBottom: '2px',
              }}
            >
              {label}
            </Link>
          ))}

          {/* Auth / watchlist links – always render; fall back to logged-out view while loading */}
          <>
            {user ? (
              <>
                <Link
                  href="/watchlist"
                  aria-current={pathname === '/watchlist' ? 'page' : undefined}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    color: pathname === '/watchlist' ? 'var(--gold)' : 'var(--text-primary)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                    fontWeight: pathname === '/watchlist' ? 600 : 400,
                    borderBottom: pathname === '/watchlist' ? '2px solid var(--gold)' : '2px solid transparent',
                    paddingBottom: '2px',
                  }}
                >
                  My Watchlist
                </Link>
                <button
                  onClick={handleSignOut}
                  className="btn btn-ghost btn-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/watchlist"
                  aria-current={pathname === '/watchlist' ? 'page' : undefined}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                    fontWeight: 500,
                    borderBottom: pathname === '/watchlist' ? '2px solid var(--gold)' : '2px solid transparent',
                    paddingBottom: '2px',
                  }}
                >
                  My Watchlist
                </Link>
                <Link
                  href="/auth/login"
                  className="btn btn-ghost btn-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn btn-gold btn-sm"
                >
                  Create Account
                </Link>
              </>
            )}
          </>
        </nav>

        {/* Hamburger button (mobile only) */}
        <button
          className="hamburger-btn"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="mobile-nav-overlay-header">
            <Link href="/" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
                SessionSource
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, marginTop: '2px' }}>
                Louisiana Legislature
              </div>
            </Link>
            <button
              aria-label="Close navigation menu"
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--white)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav>
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="mobile-nav-link"
                aria-current={pathname === href ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/watchlist"
              className="mobile-nav-link"
              aria-current={pathname === '/watchlist' ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              My Watchlist
            </Link>
          </nav>

          <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {user ? (
              <button
                onClick={() => { setMobileOpen(false); handleSignOut() }}
                className="btn btn-ghost"
                style={{ width: '100%', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="btn btn-ghost"
                  style={{ width: '100%', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn btn-gold"
                  style={{ width: '100%' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
