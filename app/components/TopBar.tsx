'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import Logo from './Logo'

const SESSION_START = new Date('2026-03-09T00:00:00')
const SESSION_END = new Date('2026-06-01T18:00:00') // Sine die no later than 6pm June 1

function getSessionStatus() {
  const now = new Date()
  if (now < SESSION_START) {
    const daysUntil = Math.ceil((SESSION_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'before' as const, daysUntil }
  }
  if (now <= SESSION_END) {
    const dayN = Math.ceil((now.getTime() - SESSION_START.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'active' as const, dayN }
  }
  return { type: 'ended' as const }
}

const NAV_LINKS = [
  { href: '/', label: 'Bills' },
  { href: '/news', label: 'News' },
  { href: '/legislators', label: 'Legislators' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/about', label: 'About' },
]

export default function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const { watchedIds } = useWatchlist()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const sessionStatus = getSessionStatus()

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    router.push('/')
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || user?.user_metadata?.full_name?.charAt(0).toUpperCase() || '?'

  return (
    <>
      {/* ── Top Bar ── */}
      <div style={{
        background: 'var(--navy)',
        height: '72px',
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
        className="topbar-root"
      >
        <div style={{
          maxWidth: 'var(--width-content)',
          margin: '0 auto',
          padding: '0 var(--space-6)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* ── Left: Branding ── */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo variant="full" size="sm" theme="dark" hideIcon={true} />
          </Link>

          {/* ── Center: Nav links (desktop) ── */}
          <nav className="topbar-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                    paddingBottom: '2px',
                    transition: 'color 150ms ease',
                  }}
                  className="topbar-nav-link"
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* ── Session pill (desktop) ── */}
          <div className="topbar-session-pill">
            {sessionStatus.type === 'before' && (
              <div style={{
                background: 'rgba(196,146,42,0.15)',
                border: '1px solid rgba(196,146,42,0.3)',
                borderRadius: 'var(--radius-full)',
                padding: 'var(--space-1) var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  display: 'inline-block',
                  animation: 'topbar-pulse 2.5s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gold)',
                  fontWeight: 'var(--weight-medium)',
                  whiteSpace: 'nowrap',
                }}>
                  Session opens in {sessionStatus.daysUntil} day{sessionStatus.daysUntil !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {sessionStatus.type === 'active' && (
              <div style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 'var(--radius-full)',
                padding: 'var(--space-1) var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  display: 'inline-block',
                  animation: 'topbar-pulse 1.5s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: '#86efac',
                  fontWeight: 'var(--weight-medium)',
                  whiteSpace: 'nowrap',
                }}>
                  2026 Regular Session · Sine Die: June 1
                </span>
              </div>
            )}
          </div>

          {/* ── Right: User actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/watchlist" style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      color: 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      fontWeight: 'var(--weight-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      transition: 'color 150ms ease',
                      position: 'relative',
                    }}
                      className="topbar-watchlist-link topbar-desktop-nav"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      My Watchlist
                      {watchedIds.size > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '18px',
                          height: '18px',
                          borderRadius: '9px',
                          background: 'var(--navy)',
                          border: '1.5px solid var(--gold)',
                          color: 'white',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '0 4px',
                          lineHeight: 1,
                        }}>
                          {watchedIds.size}
                        </span>
                      )}
                    </Link>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setUserMenuOpen(o => !o)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--gold)',
                          color: 'var(--navy)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--weight-bold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="User menu"
                      >
                        {userInitial}
                      </button>
                      {userMenuOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '40px',
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-lg)',
                          minWidth: '160px',
                          zIndex: 200,
                          overflow: 'hidden',
                        }}>
                          <Link href="/watchlist" onClick={() => setUserMenuOpen(false)} style={{
                            display: 'block',
                            padding: 'var(--space-3) var(--space-4)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }} className="topbar-menu-item">
                            My Watchlist
                          </Link>
                          <button onClick={handleSignOut} style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: 'var(--space-3) var(--space-4)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--error)',
                            background: 'none',
                            border: 'none',
                            borderTop: '1px solid var(--border)',
                            cursor: 'pointer',
                          }} className="topbar-menu-item">
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-medium)',
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      transition: 'all 150ms ease',
                      display: 'inline-block',
                    }} className="topbar-signin-btn">
                      Sign In
                    </Link>
                    <Link href="/auth/signup" style={{
                      background: 'var(--gold)',
                      color: 'var(--navy)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-semibold)',
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      transition: 'background 150ms ease',
                      display: 'inline-block',
                    }} className="topbar-signup-btn">
                      Get Started
                    </Link>
                  </>
                )}
              </>
            )}
            {/* Mobile hamburger */}
            <button
              className="topbar-hamburger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: 'var(--space-2)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile nav overlay ── */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--navy)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-6)',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'white' }}>
              SessionSource
            </span>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <nav>
            {[...NAV_LINKS, { href: '/watchlist', label: 'My Watchlist' }].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: '56px',
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--weight-semibold)',
                color: 'white',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {user ? (
              <button onClick={() => { setMobileOpen(false); handleSignOut() }} style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}>
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}>
                  Sign In
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)} style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--gold)',
                  color: 'var(--navy)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes topbar-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .topbar-nav-link:hover { color: white !important; }
        .topbar-watchlist-link:hover { color: white !important; }
        .topbar-signin-btn:hover { border-color: white !important; background: rgba(255,255,255,0.1) !important; }
        .topbar-signup-btn:hover { background: var(--gold-light) !important; }
        .topbar-menu-item:hover { background: var(--cream) !important; }
        @media (max-width: 768px) {
          .topbar-root { height: 56px !important; }
          .topbar-desktop-nav { display: none !important; }
          .topbar-session-pill { display: none !important; }
          .topbar-hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .topbar-hamburger { display: none !important; }
        }
      `}</style>
    </>
  )
}
