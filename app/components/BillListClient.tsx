'use client'

import { useState, useMemo } from 'react'
import BillCard from './BillCard'
import SearchFilters, { FilterState } from './SearchFilters'

interface Bill {
  id: string
  bill_number: string
  title: string
  summary?: string
  author?: string
  status?: string
  last_action?: string
  last_action_date?: string
  created_at?: string
  subjects?: Array<{ subject_name: string }>
}

interface BillListClientProps {
  bills: Bill[]
  availableStatuses: string[]
  availableSubjects: string[]
}

export default function BillListClient({ bills, availableStatuses, availableSubjects }: BillListClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    subject: '',
    sortBy: 'newest'
  })

  const filteredBills = useMemo(() => {
    let result = [...bills]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchLower) ||
        bill.title.toLowerCase().includes(searchLower) ||
        bill.summary?.toLowerCase().includes(searchLower) ||
        bill.author?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.status) {
      result = result.filter(bill => bill.status === filters.status)
    }

    if (filters.subject) {
      result = result.filter(bill =>
        bill.subjects?.some(s => s.subject_name === filters.subject)
      )
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'bill_number':
          return a.bill_number.localeCompare(b.bill_number, undefined, { numeric: true })
        default:
          return 0
      }
    })

    return result
  }, [bills, filters])

  return (
    <div>
      <div className="mb-8">
        <SearchFilters
          onFilterChange={setFilters}
          availableStatuses={availableStatuses}
          availableSubjects={availableSubjects}
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredBills.length}</span> of {bills.length} bills
        </p>
      </div>

      {filteredBills.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No bills found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  )
}
