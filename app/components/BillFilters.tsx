'use client'

import { useState } from 'react'

interface BillFiltersProps {
  bills: any[]
  onFilterChange: (filteredBills: any[]) => void
  legislators: string[]
  subjects: string[]
}

export default function BillFilters({ bills, onFilterChange, legislators, subjects }: BillFiltersProps) {
  const [search, setSearch] = useState('')
  const [selectedChamber, setSelectedChamber] = useState('all')
  const [selectedLegislator, setSelectedLegislator] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const statuses = [...new Set(bills.map(b => b.status).filter(Boolean))].sort()

  const hasActiveFilters =
    search !== '' ||
    selectedChamber !== 'all' ||
    selectedLegislator !== 'all' ||
    selectedSubject !== 'all' ||
    selectedStatus !== 'all'

  const applyFilters = (s: string, chamber: string, legislator: string, subject: string, status: string) => {
    let filtered = [...bills]

    if (s.trim()) {
      const q = s.toLowerCase()
      filtered = filtered.filter(bill =>
        bill.title?.toLowerCase().includes(q) ||
        bill.description?.toLowerCase().includes(q) ||
        bill.bill_number?.toLowerCase().includes(q) ||
        bill.author?.toLowerCase().includes(q) ||
        bill.summary?.toLowerCase().includes(q)
      )
    }

    if (chamber !== 'all') {
      filtered = filtered.filter(bill => {
        const num = bill.bill_number || ''
        if (chamber === 'House') return num.startsWith('HB') || num.startsWith('HR')
        if (chamber === 'Senate') return num.startsWith('SB') || num.startsWith('SR')
        return true
      })
    }

    if (legislator !== 'all') {
      filtered = filtered.filter(bill => bill.author === legislator)
    }

    if (subject !== 'all') {
      filtered = filtered.filter(bill =>
        bill.subjects?.some((s: any) => s.subject_name === subject)
      )
    }

    if (status !== 'all') {
      filtered = filtered.filter(bill => bill.status === status)
    }

    onFilterChange(filtered)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    applyFilters(value, selectedChamber, selectedLegislator, selectedSubject, selectedStatus)
  }

  const handleChamberChange = (value: string) => {
    setSelectedChamber(value)
    applyFilters(search, value, selectedLegislator, selectedSubject, selectedStatus)
  }

  const handleLegislatorChange = (value: string) => {
    setSelectedLegislator(value)
    applyFilters(search, selectedChamber, value, selectedSubject, selectedStatus)
  }

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value)
    applyFilters(search, selectedChamber, selectedLegislator, value, selectedStatus)
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    applyFilters(search, selectedChamber, selectedLegislator, selectedSubject, value)
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedChamber('all')
    setSelectedLegislator('all')
    setSelectedSubject('all')
    setSelectedStatus('all')
    onFilterChange(bills)
  }

  const selectStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #DDD8CE',
    background: '#fff',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    color: '#333',
    outline: 'none',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px',
    cursor: 'pointer',
  }

  const labelStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: '10px',
    fontWeight: 600,
    color: '#888',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #DDD8CE',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 700,
          color: '#0C2340',
          margin: 0,
        }}>
          Filter Bills
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#C4922A',
              background: 'none',
              border: '1px solid #C4922A',
              padding: '4px 12px',
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#888',
          pointerEvents: 'none',
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search bills by title, number, legislator, keyword..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            border: search ? '1px solid #C4922A' : '1px solid #DDD8CE',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: '#333',
            outline: 'none',
            boxSizing: 'border-box',
            background: '#FDFCFA',
          }}
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="filter-grid">
        <div>
          <label style={labelStyle}>Chamber</label>
          <select value={selectedChamber} onChange={e => handleChamberChange(e.target.value)} style={selectStyle}>
            <option value="all">All Chambers</option>
            <option value="House">House</option>
            <option value="Senate">Senate</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Legislator</label>
          <select value={selectedLegislator} onChange={e => handleLegislatorChange(e.target.value)} style={selectStyle}>
            <option value="all">All Legislators</option>
            {legislators.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Subject</label>
          <select value={selectedSubject} onChange={e => handleSubjectChange(e.target.value)} style={selectStyle}>
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select value={selectedStatus} onChange={e => handleStatusChange(e.target.value)} style={selectStyle}>
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
          {search && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
              Search: "{search}"
              <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', color: '#C4922A', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )}
          {selectedChamber !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
              {selectedChamber}
              <button onClick={() => handleChamberChange('all')} style={{ background: 'none', border: 'none', color: '#C4922A', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )}
          {selectedLegislator !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
              {selectedLegislator}
              <button onClick={() => handleLegislatorChange('all')} style={{ background: 'none', border: 'none', color: '#C4922A', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )}
          {selectedSubject !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
              {selectedSubject}
              <button onClick={() => handleSubjectChange('all')} style={{ background: 'none', border: 'none', color: '#C4922A', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
              {selectedStatus}
              <button onClick={() => handleStatusChange('all')} style={{ background: 'none', border: 'none', color: '#C4922A', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .filter-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}