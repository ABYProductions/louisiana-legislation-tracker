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

  return (
    <>
      <BillFilters
        bills={initialBills}
        onFilterChange={setFilteredBills}
        legislators={legislators}
        subjects={subjects}
      />

      {filteredBills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg">No bills match the selected filters.</p>
          <p className="text-slate-400 text-sm mt-2">Try adjusting your filter criteria.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-slate-600">
            Showing {filteredBills.length} of {initialBills.length} bills
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBills.map((bill: any) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </>
      )}
    </>
  )
}