'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SearchMetadata } from '@/app/api/search/metadata/route'

export interface SearchFilterState {
  chamber: string
  status: string
  committee: string
  sponsor: string
  subject: string[]
  bill_type: string[]
  has_event: string
  date_from: string
  date_to: string
  sort: string
}

export const EMPTY_FILTERS: SearchFilterState = {
  chamber: '',
  status: '',
  committee: '',
  sponsor: '',
  subject: [],
  bill_type: [],
  has_event: '',
  date_from: '',
  date_to: '',
  sort: 'date_desc',
}

interface SearchFiltersProps {
  filters: SearchFilterState
  onChange: (filters: SearchFilterState) => void
  hasQuery: boolean
  totalResults?: number
}

function hasActiveFilters(f: SearchFilterState): boolean {
  return !!(
    f.chamber ||
    f.status ||
    f.committee ||
    f.sponsor ||
    f.subject.length > 0 ||
    f.bill_type.length > 0 ||
    f.has_event ||
    f.date_from ||
    f.date_to
  )
}

function countActiveFilters(f: SearchFilterState): number {
  let n = 0
  if (f.chamber) n++
  if (f.status) n++
  if (f.committee) n++
  if (f.sponsor) n++
  n += f.subject.length
  n += f.bill_type.length
  if (f.has_event) n++
  if (f.date_from || f.date_to) n++
  return n
}

export default function SearchFilters({
  filters,
  onChange,
  hasQuery,
}: SearchFiltersProps) {
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Committee autocomplete state
  const [committeeQuery, setCommitteeQuery] = useState(filters.committee)
  const [committeeDropdownOpen, setCommitteeDropdownOpen] = useState(false)
  const committeeRef = useRef<HTMLDivElement>(null)

  // Sponsor autocomplete state
  const [sponsorQuery, setSponsorQuery] = useState(filters.sponsor)
  const [sponsorDropdownOpen, setSponsorDropdownOpen] = useState(false)
  const sponsorRef = useRef<HTMLDivElement>(null)

  const activeCount = countActiveFilters(filters)

  useEffect(() => {
    fetch('/api/search/metadata')
      .then(r => r.json())
      .then(setMetadata)
      .catch(() => {})
  }, [])

  // Sync committee input when external filter changes
  useEffect(() => {
    setCommitteeQuery(filters.committee)
  }, [filters.committee])

  // Sync sponsor input when external filter changes
  useEffect(() => {
    setSponsorQuery(filters.sponsor)
  }, [filters.sponsor])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!committeeRef.current?.contains(e.target as Node)) {
        setCommitteeDropdownOpen(false)
      }
      if (!sponsorRef.current?.contains(e.target as Node)) {
        setSponsorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const update = useCallback(
    (patch: Partial<SearchFilterState>) => {
      onChange({ ...filters, ...patch })
    },
    [filters, onChange]
  )

  const clearAll = () => {
    onChange({ ...EMPTY_FILTERS, sort: filters.sort })
    setCommitteeQuery('')
    setSponsorQuery('')
  }

  // Filtered committees from metadata
  const filteredCommittees = (metadata?.committees || []).filter(c =>
    committeeQuery.length === 0 ||
    c.name.toLowerCase().includes(committeeQuery.toLowerCase())
  ).slice(0, 20)

  // Filtered sponsors from metadata
  const filteredSponsors = (metadata?.sponsors || []).filter(s =>
    sponsorQuery.length === 0 ||
    s.name.toLowerCase().includes(sponsorQuery.toLowerCase())
  ).slice(0, 20)

  const ALL_BILL_TYPES = ['HB', 'SB', 'HCR', 'SCR', 'HR', 'SR']

  const toggleBillType = (bt: string) => {
    const current = filters.bill_type
    if (current.includes(bt)) {
      update({ bill_type: current.filter(x => x !== bt) })
    } else {
      update({ bill_type: [...current, bt] })
    }
  }

  const addSubject = (subj: string) => {
    if (subj && !filters.subject.includes(subj)) {
      update({ subject: [...filters.subject, subj] })
    }
  }

  const removeSubject = (subj: string) => {
    update({ subject: filters.subject.filter(s => s !== subj) })
  }

  const setDatePreset = (preset: 'week' | '30days' | 'session') => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    if (preset === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      update({ date_from: fmt(weekAgo), date_to: fmt(today) })
    } else if (preset === '30days') {
      const ago = new Date(today)
      ago.setDate(today.getDate() - 30)
      update({ date_from: fmt(ago), date_to: fmt(today) })
    } else if (preset === 'session') {
      update({ date_from: '2026-01-01', date_to: fmt(today) })
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--border)',
    background: 'var(--white)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '28px',
    appearance: 'none',
  }

  const panelContent = (
    <div>
      {/* Chamber segmented control */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Chamber</div>
        <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', width: 'fit-content' }}>
          {(['', 'House', 'Senate'] as const).map((ch, i) => (
            <button
              key={ch}
              type="button"
              aria-pressed={filters.chamber === ch}
              onClick={() => update({ chamber: ch })}
              style={{
                padding: '7px 18px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: filters.chamber === ch ? 600 : 400,
                background: filters.chamber === ch ? 'var(--navy)' : 'var(--white)',
                color: filters.chamber === ch ? 'var(--white)' : 'var(--text-primary)',
                border: 'none',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {ch || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Bill Type multi-select toggles */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Bill Type</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {ALL_BILL_TYPES.map(bt => {
            const active = filters.bill_type.includes(bt)
            return (
              <button
                key={bt}
                type="button"
                aria-pressed={active}
                onClick={() => toggleBillType(bt)}
                style={{
                  padding: '5px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'var(--navy)' : 'var(--white)',
                  color: active ? 'var(--white)' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {bt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status select */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="filter-status" style={labelStyle}>Status</label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={e => update({ status: e.target.value })}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          {(metadata?.statuses || []).map(s => (
            <option key={s.value} value={s.value}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
      </div>

      {/* Committee autocomplete */}
      <div style={{ marginBottom: '20px' }} ref={committeeRef}>
        <label htmlFor="filter-committee" style={labelStyle}>Committee</label>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', background: 'var(--white)' }}>
            <input
              id="filter-committee"
              type="text"
              placeholder="Type to filter committees..."
              value={committeeQuery}
              onChange={e => {
                setCommitteeQuery(e.target.value)
                setCommitteeDropdownOpen(true)
                if (!e.target.value) update({ committee: '' })
              }}
              onFocus={() => setCommitteeDropdownOpen(true)}
              style={{ ...inputStyle, border: 'none', flex: 1 }}
            />
            {filters.committee && (
              <button
                type="button"
                onClick={() => { update({ committee: '' }); setCommitteeQuery('') }}
                aria-label="Clear committee filter"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            )}
          </div>
          {committeeDropdownOpen && filteredCommittees.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              zIndex: 50,
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {filteredCommittees.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    update({ committee: c.name })
                    setCommitteeQuery(c.name)
                    setCommitteeDropdownOpen(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    background: filters.committee === c.name ? 'var(--cream)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--cream)',
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    ({c.chamber}, {c.count})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {filters.committee && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Filtering: <strong>{filters.committee}</strong>
          </div>
        )}
      </div>

      {/* Sponsor/Author autocomplete */}
      <div style={{ marginBottom: '20px' }} ref={sponsorRef}>
        <label htmlFor="filter-sponsor" style={labelStyle}>Author / Sponsor</label>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', background: 'var(--white)' }}>
            <input
              id="filter-sponsor"
              type="text"
              placeholder="Type to search authors..."
              value={sponsorQuery}
              onChange={e => {
                setSponsorQuery(e.target.value)
                setSponsorDropdownOpen(true)
                if (!e.target.value) update({ sponsor: '' })
              }}
              onFocus={() => setSponsorDropdownOpen(true)}
              style={{ ...inputStyle, border: 'none', flex: 1 }}
            />
            {filters.sponsor && (
              <button
                type="button"
                onClick={() => { update({ sponsor: '' }); setSponsorQuery('') }}
                aria-label="Clear author filter"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            )}
          </div>
          {sponsorDropdownOpen && filteredSponsors.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              zIndex: 50,
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {filteredSponsors.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    update({ sponsor: s.name })
                    setSponsorQuery(s.name)
                    setSponsorDropdownOpen(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    background: filters.sponsor === s.name ? 'var(--cream)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--cream)',
                    cursor: 'pointer',
                  }}
                >
                  {s.name}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    ({s.chamber})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {filters.sponsor && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Filtering: <strong>{filters.sponsor}</strong>
          </div>
        )}
      </div>

      {/* Subject multi-select */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="filter-subject" style={labelStyle}>Subject</label>
        <select
          id="filter-subject"
          value=""
          onChange={e => { if (e.target.value) addSubject(e.target.value) }}
          style={selectStyle}
        >
          <option value="">
            {filters.subject.length > 0
              ? `${filters.subject.length} selected — add more`
              : 'Select a subject...'}
          </option>
          {(metadata?.subjects || [])
            .filter(s => !filters.subject.includes(s.name))
            .map(s => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
        </select>
        {filters.subject.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {filters.subject.map(s => (
              <span
                key={s}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--cream)',
                  border: '1px solid var(--navy)',
                  color: 'var(--navy)',
                  padding: '3px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSubject(s)}
                  aria-label={`Remove subject ${s}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--navy)', lineHeight: 1, fontSize: '14px' }}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Has Event toggle */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Events</div>
        <button
          type="button"
          aria-pressed={filters.has_event === 'true'}
          onClick={() => update({ has_event: filters.has_event === 'true' ? '' : 'true' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: filters.has_event === 'true' ? 600 : 400,
            background: filters.has_event === 'true' ? 'var(--navy)' : 'var(--white)',
            color: filters.has_event === 'true' ? 'var(--white)' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Has Scheduled Event
        </button>
      </div>

      {/* Date range */}
      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>Date Range (Last Action)</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="filter-date-from" style={{ ...labelStyle, fontSize: '11px' }}>From</label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.date_from}
              onChange={e => update({ date_from: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="filter-date-to" style={{ ...labelStyle, fontSize: '11px' }}>To</label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.date_to}
              onChange={e => update({ date_to: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['week', '30days', 'session'] as const).map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              style={{
                padding: '4px 10px',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                background: 'var(--white)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {preset === 'week' ? 'This Week' : preset === '30days' ? 'Last 30 Days' : 'Session'}
            </button>
          ))}
        </div>
      </div>

      {/* Sort control */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="filter-sort" style={labelStyle}>Sort</label>
        <select
          id="filter-sort"
          value={filters.sort}
          onChange={e => update({ sort: e.target.value })}
          style={selectStyle}
        >
          {hasQuery && <option value="relevance">Most Relevant</option>}
          <option value="date_desc">Most Recent</option>
          <option value="date_asc">Oldest First</option>
          <option value="bill_number">Bill Number A&rarr;Z</option>
        </select>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters(filters) && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {filters.chamber && (
              <FilterChip label={`Chamber: ${filters.chamber}`} onRemove={() => update({ chamber: '' })} />
            )}
            {filters.status && (
              <FilterChip
                label={`Status: ${filters.status}`}
                onRemove={() => update({ status: '' })}
              />
            )}
            {filters.committee && (
              <FilterChip label={`Committee: ${filters.committee}`} onRemove={() => { update({ committee: '' }); setCommitteeQuery('') }} />
            )}
            {filters.sponsor && (
              <FilterChip label={`Author: ${filters.sponsor}`} onRemove={() => { update({ sponsor: '' }); setSponsorQuery('') }} />
            )}
            {filters.subject.map(s => (
              <FilterChip key={s} label={`Subject: ${s}`} onRemove={() => removeSubject(s)} />
            ))}
            {filters.bill_type.map(bt => (
              <FilterChip key={bt} label={bt} onRemove={() => toggleBillType(bt)} />
            ))}
            {filters.has_event && (
              <FilterChip label="Has Event" onRemove={() => update({ has_event: '' })} />
            )}
            {(filters.date_from || filters.date_to) && (
              <FilterChip
                label={`Date: ${filters.date_from || '…'} – ${filters.date_to || '…'}`}
                onRemove={() => update({ date_from: '', date_to: '' })}
              />
            )}
          </div>
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              color: 'var(--navy)',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <div className="search-filters-mobile-toggle" style={{ display: 'none', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            background: 'var(--white)',
            color: 'var(--navy)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </span>
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ transform: mobileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Desktop always visible, mobile collapsible */}
      <div
        className="search-filters-panel"
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        {panelContent}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .search-filters-mobile-toggle { display: block !important; }
          .search-filters-panel { display: ${mobileOpen ? 'block' : 'none'} !important; }
        }
      `}</style>
    </>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: 'var(--cream)',
      border: '1px solid var(--navy)',
      color: 'var(--navy)',
      padding: '3px 8px',
      fontSize: '12px',
      fontFamily: 'var(--font-sans)',
    }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--navy)',
          lineHeight: 1,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        &times;
      </button>
    </span>
  )
}
