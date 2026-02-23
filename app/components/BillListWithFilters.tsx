'use client'

import BillCard from './BillCard'

interface Props {
  bills: any[]
  legislators: string[]
  statuses: string[]
  subjects: string[]
  totalCount: number
  currentSearch: string
  currentChamber: string
  currentLegislator: string
  currentStatus: string
  currentSubject: string
}

export default function BillListWithFilters({
  bills,
  legislators,
  statuses,
  subjects,
  totalCount,
  currentSearch,
  currentChamber,
  currentLegislator,
  currentStatus,
  currentSubject,
}: Props) {
  const isFiltered = !!(currentSearch || currentChamber || currentLegislator || currentStatus || currentSubject)

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
      <div style={{ background: '#fff', border: '1px solid #DDD8CE', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700, color: '#0C2340', margin: '0 0 20px 0' }}>
          Filter Bills
        </h3>

        <form method="GET" action="/">

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="search"
              placeholder="Search by title, bill number, legislator, or keyword..."
              defaultValue={currentSearch}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }} className="filter-grid">
            <div>
              <label style={labelStyle}>Chamber</label>
              <select name="chamber" defaultValue={currentChamber} style={selectStyle}>
                <option value="">All Chambers</option>
                <option value="House">House</option>
                <option value="Senate">Senate</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Legislator</label>
              <select name="legislator" defaultValue={currentLegislator} style={selectStyle}>
                <option value="">All Legislators</option>
                {legislators.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject</label>
              <select name="subject" defaultValue={currentSubject} style={selectStyle}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select name="status" defaultValue={currentStatus} style={selectStyle}>
                <option value="">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{
              fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#fff', background: '#0C2340', border: 'none',
              padding: '10px 28px', cursor: 'pointer',
            }}>
              Apply Filters
            </button>
            {isFiltered && (
              <a href="/" style={{
                fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#C4922A', background: '#fff', border: '1px solid #C4922A',
                padding: '10px 28px', cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}>
                Clear Filters
              </a>
            )}
          </div>

        </form>

        {isFiltered && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
            {currentSearch && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
                Search: "{currentSearch}"
              </span>
            )}
            {currentChamber && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
                {currentChamber}
              </span>
            )}
            {currentLegislator && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
                {currentLegislator}
              </span>
            )}
            {currentSubject && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
                {currentSubject}
              </span>
            )}
            {currentStatus && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0C2340', color: '#fff', padding: '3px 10px', fontSize: '11px', fontFamily: 'var(--font-sans)' }}>
                {currentStatus}
              </span>
            )}
          </div>
        )}
      </div>

      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        {isFiltered ? `Showing ${bills.length} of ${totalCount} bills` : `${totalCount} bills total`}
      </p>

      {bills.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #DDD8CE', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#0C2340', marginBottom: '8px' }}>No bills match your filters</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888', marginBottom: '16px' }}>Try adjusting your search or filter criteria</p>
          <a href="/" style={{
            fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#C4922A', background: '#fff', border: '1px solid #C4922A',
            padding: '8px 24px', textDecoration: 'none', display: 'inline-block',
          }}>Clear Filters</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }} className="bills-grid">
          {bills.map((bill: any) => (
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
