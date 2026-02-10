'use client'

import { useState } from 'react'

interface BillFiltersProps {
  bills: any[]
  onFilterChange: (filteredBills: any[]) => void
  legislators: string[]
  subjects: string[]
}

export default function BillFilters({ bills, onFilterChange, legislators, subjects }: BillFiltersProps) {
  const [selectedChamber, setSelectedChamber] = useState<string>('all')
  const [selectedLegislator, setSelectedLegislator] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const applyFilters = (
    chamber: string,
    legislator: string,
    subject: string,
    status: string
  ) => {
    let filtered = [...bills]

    if (chamber !== 'all') {
      filtered = filtered.filter(bill => bill.body === chamber)
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

  const handleChamberChange = (value: string) => {
    setSelectedChamber(value)
    applyFilters(value, selectedLegislator, selectedSubject, selectedStatus)
  }

  const handleLegislatorChange = (value: string) => {
    setSelectedLegislator(value)
    applyFilters(selectedChamber, value, selectedSubject, selectedStatus)
  }

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value)
    applyFilters(selectedChamber, selectedLegislator, value, selectedStatus)
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    applyFilters(selectedChamber, selectedLegislator, selectedSubject, value)
  }

  const clearFilters = () => {
    setSelectedChamber('all')
    setSelectedLegislator('all')
    setSelectedSubject('all')
    setSelectedStatus('all')
    onFilterChange(bills)
  }

  const hasActiveFilters = 
    selectedChamber !== 'all' || 
    selectedLegislator !== 'all' || 
    selectedSubject !== 'all' || 
    selectedStatus !== 'all'

  // Get unique statuses from bills
  const statuses = [...new Set(bills.map(b => b.status).filter(Boolean))].sort()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#002868]">Filter Bills</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-[#002868] hover:text-[#f4c430] font-medium underline"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chamber Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Chamber
          </label>
          <select
            value={selectedChamber}
            onChange={(e) => handleChamberChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#002868] focus:border-transparent outline-none"
          >
            <option value="all">All Chambers</option>
            <option value="House">House</option>
            <option value="Senate">Senate</option>
          </select>
        </div>

        {/* Legislator Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Legislator
          </label>
          <select
            value={selectedLegislator}
            onChange={(e) => handleLegislatorChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#002868] focus:border-transparent outline-none"
          >
            <option value="all">All Legislators</option>
            {legislators.map((legislator) => (
              <option key={legislator} value={legislator}>
                {legislator}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#002868] focus:border-transparent outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#002868] focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedChamber !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#002868] text-white rounded-full text-sm">
              Chamber: {selectedChamber}
              <button
                onClick={() => handleChamberChange('all')}
                className="hover:text-[#f4c430]"
              >
                ×
              </button>
            </span>
          )}
          {selectedLegislator !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#002868] text-white rounded-full text-sm">
              Legislator: {selectedLegislator}
              <button
                onClick={() => handleLegislatorChange('all')}
                className="hover:text-[#f4c430]"
              >
                ×
              </button>
            </span>
          )}
          {selectedSubject !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#002868] text-white rounded-full text-sm">
              Subject: {selectedSubject}
              <button
                onClick={() => handleSubjectChange('all')}
                className="hover:text-[#f4c430]"
              >
                ×
              </button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#002868] text-white rounded-full text-sm">
              Status: {selectedStatus}
              <button
                onClick={() => handleStatusChange('all')}
                className="hover:text-[#f4c430]"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}