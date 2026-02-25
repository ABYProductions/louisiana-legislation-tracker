'use client'

import { useRef, useState, useEffect, useCallback, useId } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Suggestion } from '@/app/api/search/suggest/route'

interface SearchBarProps {
  initialQuery?: string
  totalResults?: number
  activeFilters?: Record<string, string>
  onSearch?: (q: string) => void
  /** If true, search submits by navigating to /?q=... instead of calling onSearch */
  navigateOnSubmit?: boolean
}

export default function SearchBar({
  initialQuery = '',
  totalResults,
  activeFilters = {},
  onSearch,
  navigateOnSubmit = false,
}: SearchBarProps) {
  const [value, setValue] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listboxId = useId()
  const liveRegionRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Sync prop → state when initialQuery changes (e.g. URL navigation)
  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  // / key focuses search bar (unless already in a text input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      setDropdownOpen(false)
      return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const res = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal }
      )
      if (!res.ok) return
      const { suggestions: suggs } = await res.json()
      setSuggestions(suggs || [])
      setDropdownOpen((suggs || []).length > 0)
      setActiveIndex(-1)
    } catch {
      // aborted or network error — silent
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250)
  }

  const submitSearch = useCallback(
    (query: string) => {
      setDropdownOpen(false)
      setActiveIndex(-1)
      if (navigateOnSubmit) {
        const params = new URLSearchParams(searchParams.toString())
        if (query) {
          params.set('q', query)
        } else {
          params.delete('q')
        }
        params.set('page', '1')
        router.replace(`${pathname}?${params.toString()}`)
      } else {
        onSearch?.(query)
      }
      // Announce result count (will be updated by parent)
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Searching for ${query}...`
      }
    },
    [navigateOnSubmit, onSearch, pathname, router, searchParams]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitSearch(value)
      }
      if (e.key === 'Escape') {
        setValue('')
        setSuggestions([])
        setDropdownOpen(false)
        if (navigateOnSubmit) submitSearch('')
        else onSearch?.('')
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex])
      } else {
        submitSearch(value)
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
    }
  }

  const selectSuggestion = (s: Suggestion) => {
    setDropdownOpen(false)
    setActiveIndex(-1)
    if (s.url) {
      router.push(s.url)
    } else {
      const v = s.value || s.label
      setValue(v)
      submitSearch(v)
    }
  }

  const handleClear = () => {
    setValue('')
    setSuggestions([])
    setDropdownOpen(false)
    inputRef.current?.focus()
    if (navigateOnSubmit) submitSearch('')
    else onSearch?.('')
  }

  // Announce result count when it changes
  useEffect(() => {
    if (liveRegionRef.current && totalResults !== undefined) {
      liveRegionRef.current.textContent =
        totalResults === 0
          ? `No results found${initialQuery ? ` for ${initialQuery}` : ''}`
          : `${totalResults} result${totalResults !== 1 ? 's' : ''} found${initialQuery ? ` for ${initialQuery}` : ''}`
    }
  }, [totalResults, initialQuery])

  const hasActiveFilters = Object.keys(activeFilters).length > 0
  const filterSummary = Object.entries(activeFilters)
    .filter(([k]) => k !== 'q')
    .map(([, v]) => v)
    .join(' · ')

  // Group suggestions by type
  const billSuggs    = suggestions.filter(s => s.type === 'bill')
  const legSuggs     = suggestions.filter(s => s.type === 'legislator')
  const topicSuggs   = suggestions.filter(s => s.type === 'topic' || s.type === 'committee')

  let globalIndex = 0
  const groupedSuggs: Array<{ label: string; items: Array<Suggestion & { globalIdx: number }> }> = []
  const withIndex = (items: Suggestion[]) =>
    items.map(s => ({ ...s, globalIdx: globalIndex++ }))

  if (billSuggs.length)  groupedSuggs.push({ label: 'Bills',       items: withIndex(billSuggs) })
  if (legSuggs.length)   groupedSuggs.push({ label: 'Legislators', items: withIndex(legSuggs) })
  if (topicSuggs.length) groupedSuggs.push({ label: 'Topics',      items: withIndex(topicSuggs) })

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Live region for screen readers */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      />

      <form
        role="search"
        aria-label="Search Louisiana Legislature bills"
        onSubmit={e => { e.preventDefault(); submitSearch(value) }}
        style={{ position: 'relative' }}
      >
        {/* Search icon */}
        <svg
          width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setDropdownOpen(true)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search bill text, titles, authors, subjects..."
          aria-label="Search bills"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-activedescendant={
            dropdownOpen && activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          style={{
            width: '100%',
            height: '52px',
            padding: '0 52px 0 48px',
            border: '2px solid var(--border)',
            background: 'var(--white)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          className="search-input"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Result context label */}
      {(initialQuery || hasActiveFilters) && totalResults !== undefined && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '8px',
          paddingLeft: '2px',
        }}>
          Showing <strong style={{ color: 'var(--navy)' }}>{totalResults.toLocaleString()}</strong> result{totalResults !== 1 ? 's' : ''}
          {initialQuery && <> for <em>"{initialQuery}"</em></>}
          {filterSummary && <> in {filterSummary}</>}
        </div>
      )}

      {/* Suggestions dropdown */}
      {dropdownOpen && suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {groupedSuggs.map(group => (
            <div key={group.label}>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '8px 14px 4px',
              }}>
                {group.label}
              </div>
              {group.items.map(s => (
                <button
                  key={s.globalIdx}
                  id={`suggestion-${s.globalIdx}`}
                  role="option"
                  aria-selected={activeIndex === s.globalIdx}
                  onClick={() => selectSuggestion(s)}
                  onMouseEnter={() => setActiveIndex(s.globalIdx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '9px 14px',
                    background: activeIndex === s.globalIdx ? 'var(--cream)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--cream-dark)',
                  }}
                >
                  <SuggestionIcon type={s.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.label}
                    </div>
                    {s.subtitle && (
                      <div style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {s.subtitle}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .search-input:focus {
          border-color: var(--navy);
          box-shadow: 0 0 0 3px rgba(12,35,64,0.08);
        }
        @media (max-width: 640px) {
          .search-input { height: 44px; font-size: var(--text-sm); }
        }
      `}</style>
    </div>
  )
}

function SuggestionIcon({ type }: { type: Suggestion['type'] }) {
  const color = 'var(--gold)'
  const size = 16
  if (type === 'bill') return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
  if (type === 'legislator') return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}
