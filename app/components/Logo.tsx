'use client'

import React from 'react'

interface LogoProps {
  variant?: 'full' | 'icon' | 'stacked'
  size?: 'sm' | 'md' | 'lg'
  theme?: 'dark' | 'light'
  className?: string
}

const sizes = {
  sm: {
    box: 44,
    radius: 10,
    fontSize: 18,
    dotSize: 4,
    dotGap: 3,
    wordmarkSize: 28,
    taglineSize: 8.5,
    taglineSpacing: '0.26em',
    gap: 12,
    taglineTop: 5,
  },
  md: {
    box: 60,
    radius: 13,
    fontSize: 25,
    dotSize: 5,
    dotGap: 4,
    wordmarkSize: 38,
    taglineSize: 10,
    taglineSpacing: '0.28em',
    gap: 16,
    taglineTop: 6,
  },
  lg: {
    box: 80,
    radius: 17,
    fontSize: 33,
    dotSize: 6,
    dotGap: 5,
    wordmarkSize: 52,
    taglineSize: 12,
    taglineSpacing: '0.30em',
    gap: 20,
    taglineTop: 8,
  },
}

export default function Logo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  className = '',
}: LogoProps) {
  const s = sizes[size]
  const sessionColor = theme === 'dark' ? '#ffffff' : '#0d2a4a'

  // The icon box — navy square with gold gradient border, S·S inside
  const IconBox = () => (
    <div
      style={{
        position: 'relative',
        width: s.box,
        height: s.box,
        flexShrink: 0,
      }}
    >
      {/* Gold gradient border layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: s.radius,
          background:
            'linear-gradient(135deg, #d4a843 0%, #C4922A 50%, #a87820 100%)',
        }}
      />
      {/* Navy inner background */}
      <div
        style={{
          position: 'absolute',
          inset: 2.5,
          borderRadius: s.radius - 2,
          background:
            'linear-gradient(135deg, #1a3a5c 0%, #0d2a4a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* SS shadow + main + underline */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Shadow layer — gold SS offset down-right */}
          <span
            style={{
              position: 'absolute',
              fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
              fontSize: s.fontSize,
              fontWeight: 700,
              color: '#C4922A',
              opacity: 0.28,
              letterSpacing: '0.08em',
              lineHeight: 1,
              userSelect: 'none',
              transform: 'translate(2px, 2px)',
            }}
          >
            SS
          </span>
          {/* Main SS — white, sits above shadow */}
          <span
            style={{
              position: 'relative',
              fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
              fontSize: s.fontSize,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '0.08em',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            SS
          </span>
          {/* Gold underline bar */}
          <span
            style={{
              position: 'absolute',
              bottom: '18%',
              left: '18%',
              right: '18%',
              height: 2,
              borderRadius: 1,
              background: 'linear-gradient(90deg, #d4a843, #C4922A)',
              opacity: 0.7,
            }}
          />
        </div>
      </div>
    </div>
  )

  // The wordmark — "Session" + "Source" + tagline
  const Wordmark = ({ center = false }: { center?: boolean }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: center ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
          fontSize: s.wordmarkSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: sessionColor }}>Session</span>
        <span style={{ color: '#C4922A' }}>Source</span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans, 'Raleway', 'Helvetica Neue', Arial, sans-serif)",
          fontSize: s.taglineSize,
          fontWeight: 500,
          letterSpacing: s.taglineSpacing,
          textTransform: 'uppercase' as const,
          color: '#C4922A',
          marginTop: s.taglineTop,
          whiteSpace: 'nowrap',
        }}
      >
        Louisiana Legislature
        <span style={{ margin: '0 4px', opacity: 0.55 }}>·</span>
        Est. 2026
      </div>
    </div>
  )

  // variant='icon' — box only
  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconBox />
      </div>
    )
  }

  // variant='stacked' — icon above, wordmark centered below
  if (variant === 'stacked') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: s.gap,
        }}
      >
        <IconBox />
        <Wordmark center={true} />
      </div>
    )
  }

  // variant='full' (default) — icon left, wordmark right
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: s.gap,
      }}
    >
      <IconBox />
      <Wordmark />
    </div>
  )
}
