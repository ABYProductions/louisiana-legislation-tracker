// app/components/BillListClient.tsx
'use client'

import { useState, useMemo } from 'react'
import BillCard from './BillCard'
import SearchFilters from './SearchFilters'

interface Bill {
  id: number
  bill_number: string
  title: string
  description: string
  author: string
  status: string
  body: string
  subjects: { subject_name: string }[]
  summary: string
  last_action_date: string
  last_action: string | null
  created_at: string
}

interface BillListClientProps {
  bills: Bill[]
}

export default function BillListClient({ bills }: BillListClientProps) {
  const [filters, setFilters] = useState<{
    keyword: string
    author: string
    subject: string
    status: string
    chamber: string
    sortBy: string
  }>({
    keyword: '',
    author: '',
    subject: '',
    status: '',
    chamber: '',
    sortBy: 'newest'
  })

  // Extract unique values for filter dropdowns
  const authors = useMemo(() => {
    const uniqueAuthors = [...new Set(bills.map(b => b.author).filter(Boolean))]
    return uniqueAuthors.sort()
  }, [bills])

  const subjects = useMemo(() => {
    const allSubjects = bills.flatMap(b => b.subjects?.map(s => s.subject_name) || [])
    const uniqueSubjects = [...new Set(allSubjects.filter(Boolean))]
    return uniqueSubjects.sort()
  }, [bills])

  const statuses = useMemo(() => {
    const uniqueStatuses = [...new Set(bills.map(b => b.status).filter(Boolean))]
    return uniqueStatuses.sort()
  }, [bills])

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Keyword search
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase()
        const matchesKeyword = 
          bill.title?.toLowerCase().includes(keyword) ||
          bill.bill_number?.toLowerCase().includes(keyword) ||
          bill.description?.toLowerCase().includes(keyword) ||
          bill.summary?.toLowerCase().includes(keyword)
        if (!matchesKeyword) return false
      }

      // Author filter
      if (filters.author && filters.author !== 'all') {
        if (bill.author !== filters.author) return false
      }

      // Subject filter
      if (filters.subject && filters.subject !== 'all') {
        const hasSubject = bill.subjects?.some(s => s.subject_name === filters.subject)
        if (!hasSubject) return false
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        if (bill.status !== filters.status) return false
      }

      // Chamber filter
      if (filters.chamber && filters.chamber !== 'all') {
        const billChamber = bill.body?.toLowerCase()
        if (billChamber !== filters.chamber.toLowerCase()) return false
      }

      return true
    })
  }, [bills, filters])

  // Sort bills
  const sortedBills = useMemo(() => {
    const sorted = [...filteredBills]
    
    switch (filters.sortBy) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      case 'bill_number':
        return sorted.sort((a, b) => 
          a.bill_number.localeCompare(b.bill_number)
        )
      case 'last_action':
        return sorted.sort((a, b) => {
          const dateA = a.last_action_date ? new Date(a.last_action_date).getTime() : 0
          const dateB = b.last_action_date ? new Date(b.last_action_date).getTime() : 0
          return dateB - dateA
        })
      default:
        return sorted
    }
  }, [filteredBills, filters.sortBy])

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <SearchFilters
        authors={authors}
        subjects={subjects}
        statuses={statuses}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-slate-600">
          Showing <span className="font-semibold text-[#002868]">{sortedBills.length}</span> of {bills.length} bills
        </p>
        
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Sort by:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002868]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="bill_number">Bill Number</option>
            <option value="last_action">Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Bill Cards */}
      <div className="grid gap-4">
        {sortedBills.length > 0 ? (
          sortedBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No bills found matching your filters.</p>
            <button
              onClick={() => setFilters({
                keyword: '',
                author: '',
                subject: '',
                status: '',
                chamber: '',
                sortBy: 'newest'
              })}
              className="mt-4 px-4 py-2 bg-[#002868] text-white rounded-lg hover:bg-[#001a4d] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}