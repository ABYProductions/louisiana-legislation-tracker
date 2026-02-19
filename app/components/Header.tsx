'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  const links = [
    { href: '/#bills', label: 'All Bills' },
    { href: '/legislators', label: 'Legislators' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/about', label: 'About' },
  ]

  return (
    <>
      {/* Top utility bar */}
      <div style={{
        background: '#0C2340',
        padding: '9px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
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
          fontSize: '11px',
          color: '#C4922A',
          fontWeight: 500,
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            background: '#C4922A',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          Session opens March 10, 2026
        </span>
      </div>

      {/* Main nav */}
      <header style={{
        background: '#F7F4EF',
        borderBottom: '1px solid #DDD8CE',
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
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '27px', fontWeight: 700, color: '#0C2340', letterSpacing: '0.02em', lineHeight: 1 }}>
            SessionSource
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#C4922A', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, marginTop: '2px' }}>
            Louisiana Legislature
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: pathname === href ? '#C4922A' : '#444',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                fontWeight: pathname === href ? 600 : 400,
                borderBottom: pathname === href ? '2px solid #C4922A' : '2px solid transparent',
                paddingBottom: '2px',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
