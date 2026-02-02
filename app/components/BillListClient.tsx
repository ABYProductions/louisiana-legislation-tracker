'use client'

import { useState, useMemo } from 'react'
import BillCard from './BillCard'
import SearchFilters, { SearchFilters as SearchFiltersType } from './SearchFilters'

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
  created_at: string
}

interface BillListClientProps {
  bills: Bill[]
}

export default function BillListClient({ bills }: BillListClientProps) {
  const [filters, setFilters] = useState<SearchFiltersType>({
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

  // Filter and sort bills
  const filteredBills = useMemo(() => {
    let result = [...bills]

    // Keyword search
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      result = result.filter(bill =>
        bill.bill_number?.toLowerCase().includes(keyword) ||
        bill.title?.toLowerCase().includes(keyword) ||
        bill.description?.toLowerCase().includes(keyword) ||
        bill.author?.toLowerCase().includes(keyword) ||
        bill.summary?.toLowerCase().includes(keyword) ||
        bill.subjects?.some(s => s.subject_name?.toLowerCase().includes(keyword))
      )
    }

    // Author filter
    if (filters.author) {
      result = result.filter(bill => bill.author === filters.author)
    }

    // Subject filter
    if (filters.subject) {
      result = result.filter(bill =>
        bill.subjects?.some(s => s.subject_name === filters.subject)
      )
    }

    // Status filter
    if (filters.status) {
      result = result.filter(bill => bill.status === filters.status)
    }

    // Chamber filter
    if (filters.chamber) {
      result = result.filter(bill => bill.body === filters.chamber)
    }

    // Sorting
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.last_action_date || b.created_at).getTime() - new Date(a.last_action_date || a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.last_action_date || a.created_at).getTime() - new Date(b.last_action_date || b.created_at).getTime())
        break
      case 'bill_number':
        result.sort((a, b) => a.bill_number.localeCompare(b.bill_number))
        break
      case 'author':
        result.sort((a, b) => (a.author || '').localeCompare(b.author || ''))
        break
    }

    return result
  }, [bills, filters])

  return (
    <div>
      <SearchFilters
        onSearch={setFilters}
        authors={authors}
        subjects={subjects}
        statuses={statuses}
      />

      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredBills.length}</span> of {bills.length} bills
        </p>
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No bills found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  )
}