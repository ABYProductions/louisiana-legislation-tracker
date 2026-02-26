'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const SESSION_START = new Date('2026-03-09T00:00:00')
const SESSION_END = new Date('2026-06-01T18:00:00') // Sine die no later than 6pm June 1

function getDaysLabel(): string {
  const now = new Date()
  if (now < SESSION_START) {
    const days = Math.ceil((SESSION_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return String(days)
  }
  if (now <= SESSION_END) {
    return 'June 1'
  }
  return '—'
}

function getDaysSubLabel(): string {
  const now = new Date()
  if (now < SESSION_START) return 'Days Until Session'
  if (now <= SESSION_END) return 'Sine Die Deadline'
  return 'Session Ended'
}

interface CommandHeaderProps {
  totalCount: number
  summaryCount: number
  legislatorCount: number
  initialQuery: string
}

const CHIPS = [
  { id: 'house', label: 'House Bills', param: 'bill_type', value: 'HB' },
  { id: 'senate', label: 'Senate Bills', param: 'bill_type', value: 'SB' },
  { id: 'hearing', label: 'Has Hearing', param: 'has_event', value: 'yes' },
  { id: 'week', label: 'This Week', param: 'has_event', value: 'this_week' },
  { id: 'concurrent', label: 'Concurrent Resolutions', param: 'bill_type', value: 'HCR' },
]

function CommandHeaderContent({ totalCount, summaryCount, legislatorCount, initialQuery }: CommandHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inputValue, setInputValue] = useState(initialQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync input when URL changes externally (browser back/forward)
  useEffect(() => {
    setInputValue(searchParams.get('q') || '')
  }, [searchParams])

  const handleInputChange = useCallback((val: string) => {
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (val) {
        params.set('q', val)
      } else {
        params.delete('q')
      }
      params.delete('page')
      router.replace(params.toString() ? `/?${params.toString()}` : '/', { scroll: false })
    }, 300)
  }, [router, searchParams])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('cmd-search-input')?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const toggleChip = useCallback((chip: typeof CHIPS[0]) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentValues = params.getAll(chip.param)
    const isActive = currentValues.includes(chip.value)

    params.delete(chip.param)
    if (!isActive) {
      params.set(chip.param, chip.value)
    } else {
      // Re-add all OTHER values for this param (excluding the toggled one)
      currentValues.filter(v => v !== chip.value).forEach(v => params.append(chip.param, v))
    }
    params.delete('page')
    router.replace(params.toString() ? `/?${params.toString()}` : '/', { scroll: false })
  }, [router, searchParams])

  const isChipActive = (chip: typeof CHIPS[0]) => {
    return searchParams.getAll(chip.param).includes(chip.value)
  }

  const daysLabel = getDaysLabel()
  const daysSubLabel = getDaysSubLabel()

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--navy) 0%, #0d2244 100%)',
      padding: 'var(--space-8) 0 var(--space-6)',
      borderBottom: '3px solid var(--gold)',
    }}>
      <div style={{
        maxWidth: 'var(--width-content)',
        margin: '0 auto',
        padding: '0 var(--space-6)',
      }}>
        {/* Search bar */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
            marginBottom: 'var(--space-2)',
          }}>
            Search {totalCount.toLocaleString()} bills by text, author, subject, or citation
          </div>
          <div style={{ position: 'relative' }}>
            {/* Search icon */}
            <svg
              width="18" height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="cmd-search-input"
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Search bills, authors, subjects, citations..."
              style={{
                width: '100%',
                height: '52px',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0 var(--space-12) 0 var(--space-12)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 150ms ease',
              }}
              className="cmd-search-input"
            />
            <span className="cmd-kbd-hint" style={{
              position: 'absolute',
              right: 'var(--space-4)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'rgba(255,255,255,0.4)',
            }}>
              ⌘K
            </span>
          </div>
        </div>

        {/* Quick filter chips */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'rgba(255,255,255,0.4)',
            marginRight: 'var(--space-1)',
            alignSelf: 'center',
            flexShrink: 0,
          }}>
            Quick filters:
          </span>
          {CHIPS.map(chip => {
            const active = isChipActive(chip)
            return (
              <button
                key={chip.id}
                onClick={() => toggleChip(chip)}
                style={{
                  background: active ? 'var(--gold)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${active ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 'var(--radius-full)',
                  padding: 'var(--space-1) var(--space-3)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                  color: active ? 'var(--navy)' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
                className="cmd-chip"
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Stats row */}
        <div style={{
          paddingTop: 'var(--space-5)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
        }}
          className="cmd-stats-row"
        >
          {[
            { number: totalCount.toLocaleString(), label: 'Bills Tracked' },
            { number: legislatorCount.toLocaleString(), label: 'Legislators' },
            { number: daysLabel, label: daysSubLabel },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                padding: '0 var(--space-6)',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--weight-bold)',
                color: 'white',
                lineHeight: 1.1,
              }}>
                {stat.number}
              </span>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginTop: '2px',
              }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .cmd-search-input::placeholder { color: rgba(255,255,255,0.35); }
        .cmd-search-input:focus {
          border-color: var(--gold) !important;
          background: rgba(255,255,255,0.12) !important;
          box-shadow: 0 0 0 3px rgba(196,146,42,0.2);
        }
        .cmd-chip:hover {
          background: rgba(255,255,255,0.14) !important;
          border-color: rgba(255,255,255,0.3) !important;
          color: white !important;
        }
        @media (max-width: 768px) {
          .cmd-kbd-hint { display: none !important; }
          .cmd-stats-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: var(--space-4) !important;
          }
          .cmd-stats-row > div {
            border-right: none !important;
            padding: 0 !important;
          }
        }
        @media (max-width: 480px) {
          .cmd-chip { font-size: 11px !important; }
        }
      `}</style>
    </div>
  )
}

function CommandHeaderFallback({ totalCount, summaryCount, legislatorCount }: Omit<CommandHeaderProps, 'initialQuery'>) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--navy) 0%, #0d2244 100%)',
      padding: 'var(--space-8) 0 var(--space-6)',
      borderBottom: '3px solid var(--gold)',
    }}>
      <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 var(--space-6)' }}>
        <div style={{ height: '24px', width: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 'var(--space-2)' }} />
        <div style={{ height: '52px', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }} />
        <div style={{ height: '32px', marginBottom: 'var(--space-5)' }} />
        <div style={{ paddingTop: 'var(--space-5)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex' }}>
          {[
            { number: totalCount.toLocaleString(), label: 'Bills Tracked' },
            { number: legislatorCount.toLocaleString(), label: 'Legislators' },
            { number: getDaysLabel(), label: getDaysSubLabel() },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, padding: '0 var(--space-6)', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'white' }}>{stat.number}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginTop: '2px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CommandHeader(props: CommandHeaderProps) {
  return (
    <Suspense fallback={<CommandHeaderFallback {...props} />}>
      <CommandHeaderContent {...props} />
    </Suspense>
  )
}
