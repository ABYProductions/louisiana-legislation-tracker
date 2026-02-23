'use client'

import { useState } from 'react'
import BillCard from './BillCard'
import BillFilters from './BillFilters'

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
  const [filteredBills, setFilteredBills] = useState(initialBills)
  const [isFiltered, setIsFiltered] = useState(false)

  const handleFilterChange = (bills: any[]) => {
    setFilteredBills(bills)
    setIsFiltered(bills.length !== initialBills.length)
  }

  return (
    <>
      <BillFilters
        bills={initialBills}
        onFilterChange={handleFilterChange}
        legislators={legislators}
        subjects={subjects}
      />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: '#666',
        }}>
          {isFiltered
            ? `Showing ${filteredBills.length} of ${initialBills.length} bills`
            : `${initialBills.length} bills total`
          }
        </p>
      </div>

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
        }
        @media (max-width: 640px) {
          .bills-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}