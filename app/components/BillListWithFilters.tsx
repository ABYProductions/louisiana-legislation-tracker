'use client'

import { useState } from 'react'
import BillCard from './BillCard'

interface BillListWithFiltersProps {
  initialBills: any[]
  legislators: string[]
  subjects: string[]
}

export default function BillListWithFilters({
  initialBills,
  legislators,
  subjects
}: BillListWithFiltersProps) {
  const [search, setSearch] = useState('')
  const [selectedChamber, setSelectedChamber] = useState('all')
  const [selectedLegislator, setSelectedLegislator] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [applied, setApplied] = useState(false)

  const statuses = [...new Set(initialBills.map(b => b.status).filter(Boolean))].sort()

  const hasActiveFilters =
    search !== '' ||
    selectedChamber !== 'all' ||
    selectedLegislator !== 'all' ||
    selectedSubject !== 'all' ||
    selectedStatus !== 'all'

  const getFilteredBills = () => {
    if (!applied) return initialBills
    let filtered = [...initialBills]

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(bill =>
        bill.title?.toLowerCase().includes(q) ||
        bill.description?.toLowerCase().includes(q) ||
        bill.bill_number?.toLowerCase().includes(q) ||
        bill.author?.toLowerCase().includes(q) ||
        bill.summary?.toLowerCase().includes(q)
      )
    }

    if (selectedChamber !== 'all') {
      filtered = filtered.filter(bill => {
        const num = bill.bill_number || ''
        if (selectedChamber === 'House') return num.startsWith('HB') || num.startsWith('HR')
        if (selectedChamber === 'Senate') return num.startsWith('SB') || num.startsWith('SR')
        return true
      })
    }

    if (selectedLegislator !== 'all') {
      filtered = filtered.filter(bill => bill.author === selectedLegislator)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(bill => bill.status === selectedStatus)
    }

    return filtered
  }

  const handleApply = () => {
    setApplied(true)
  }

  const handleClear = () => {
    setSearch('')
    setSelectedChamber('all')
    setSelectedLegislator('all')
    setSelectedSubject('all')
    setSelectedStatus('all')
    setApplied(false)
  }

  const filteredBills = getFilteredBills()

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
    <>
      {/* Filter Panel */}
      <div style={{
        background: '#fff',
        border: '1px solid #DDD8CE',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 700,
          color: '#0C2340',
          margin: '0 0 20px 0',
        }}>
          Filter Bills
        </h3>

        {/* Search */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, bill number, legislator, or keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleApply() }}
            style={{
              width: '100%',
              padding: '10px 36px',
              border: '1px solid #DDD8CE',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              color: '#333',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#FDFCFA',
            }}
          />
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }} className="filter-grid">
          <div>
            <label style={labelStyle}>Chamber</label>
            <select value={selectedChamber} onChange={e => setSelectedChamber(e.target.value)} style={selectStyle}>
              <option value="all">All Chambers</option>
              <option value="House">House</option>
              <option value="Senate">Senate</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Legislator</label>
            <select value={selectedLegislator} onChange={e => setSelectedLegislator(e.target.value)} style={selectStyle}>
              <option value="all">All Legislators</option>
              {legislators.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={selectStyle}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={selectStyle}>
              <option value="all">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Apply / Clear buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleApply}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#fff',
              background: '#0C2340',
              border: 'none',
              padding: '10px 28px',
              cursor: 'pointer',
            }}
          >
            Apply Filters
          </button>
          {(applied || hasActiveFilters) && (
            <button
              onClick={handleClear}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#C4922A',
                background: '#fff',
                border: '1px solid #C4922A',
                padding: '10px 28px',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: '#666',
        marginBottom: '16px',
      }}>
        {applied
          ? `Showing ${filteredBills.length} of ${initialBills.length} bills`
          : `${initialBills.length} bills total`
        }
      </p>

      {/* Bill grid */}
      {filteredBills.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #DDD8CE',
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#0C2340', marginBottom: '8px' }}>
            No bills match your filters
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>
            Try adjusting your search or filter criteria
          </p>
          <button onClick={handleClear} style={{
            marginTop: '16px',
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#C4922A',
            background: '#fff',
            border: '1px solid #C4922A',
            padding: '8px 24px',
            cursor: 'pointer',
          }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }} className="bills-grid">
          {filteredBills.map((bill: any) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .bills-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .filter-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .bills-grid { grid-template-columns: 1fr !important; }
          .filter-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}