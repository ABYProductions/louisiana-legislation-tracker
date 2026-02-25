'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchBar from './SearchBar'
import SearchFilters, { SearchFilterState, EMPTY_FILTERS } from './SearchFilters'
import SearchResults from './SearchResults'
import type { SearchResponse } from '@/app/api/search/route'

interface BillSearchProps {
  initialQuery: string
  initialFilters: SearchFilterState
}

function filtersAreEmpty(f: SearchFilterState): boolean {
  return (
    !f.chamber &&
    !f.status &&
    !f.committee &&
    !f.sponsor &&
    f.subject.length === 0 &&
    f.bill_type.length === 0 &&
    !f.has_event &&
    !f.date_from &&
    !f.date_to
  )
}

function buildSearchUrl(
  query: string,
  filters: SearchFilterState,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (filters.chamber) params.set('chamber', filters.chamber)
  if (filters.status) params.set('status', filters.status)
  if (filters.committee) params.set('committee', filters.committee)
  if (filters.sponsor) params.set('sponsor', filters.sponsor)
  for (const s of filters.subject) params.append('subject', s)
  for (const bt of filters.bill_type) params.append('bill_type', bt)
  if (filters.has_event) params.set('has_event', filters.has_event)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.sort && filters.sort !== 'date_desc') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  if (pageSize !== 25) params.set('limit', String(pageSize))
  const qs = params.toString()
  return qs ? `/api/search?${qs}` : '/api/search'
}

function buildCacheKey(
  query: string,
  filters: SearchFilterState,
  page: number,
  pageSize: number
): string {
  return JSON.stringify({ query, filters, page, pageSize })
}

function buildRouterParams(
  query: string,
  filters: SearchFilterState,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (filters.chamber) params.set('chamber', filters.chamber)
  if (filters.status) params.set('status', filters.status)
  if (filters.committee) params.set('committee', filters.committee)
  if (filters.sponsor) params.set('sponsor', filters.sponsor)
  for (const s of filters.subject) params.append('subject', s)
  for (const bt of filters.bill_type) params.append('bill_type', bt)
  if (filters.has_event) params.set('has_event', filters.has_event)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.sort && filters.sort !== 'date_desc') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  if (pageSize !== 25) params.set('limit', String(pageSize))
  return params.toString()
}

export default function BillSearch({ initialQuery, initialFilters }: BillSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilterState>(initialFilters)
  const [results, setResults] = useState<SearchResponse['results']>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(25)

  const cacheRef = useRef<Map<string, SearchResponse>>(new Map())
  const abortRef = useRef<AbortController | null>(null)
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  )

  // Fire-and-forget analytics
  const postAnalytics = useCallback(
    (resp: SearchResponse, q: string, f: SearchFilterState) => {
      const body = {
        query: q || null,
        filters: { ...f },
        result_count: resp.total,
        session_id: sessionIdRef.current,
      }
      fetch('/api/search/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
    },
    []
  )

  const performSearch = useCallback(
    async (q: string, f: SearchFilterState, pg: number, ps: number) => {
      const cacheKey = buildCacheKey(q, f, pg, ps)
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setResults(cached.results)
        setTotal(cached.total)
        setPage(cached.page)
        setTotalPages(cached.total_pages)
        setLoading(false)
        return
      }

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)

      try {
        const url = buildSearchUrl(q, f, pg, ps)
        const res = await fetch(url, { signal: abortRef.current.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: SearchResponse = await res.json()

        cacheRef.current.set(cacheKey, data)
        // Cap cache size at 50 entries
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value
          if (firstKey !== undefined) cacheRef.current.delete(firstKey)
        }

        setResults(data.results)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.total_pages)

        postAnalytics(data, q, f)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[BillSearch] fetch error:', err)
      } finally {
        setLoading(false)
      }
    },
    [postAnalytics]
  )

  // Sync URL → state when searchParams change externally (browser back/forward)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlPage = parseInt(searchParams.get('page') || '1', 10) || 1
    const urlLimit = parseInt(searchParams.get('limit') || '25', 10) || 25
    const urlFilters: SearchFilterState = {
      chamber: searchParams.get('chamber') || '',
      status: searchParams.get('status') || '',
      committee: searchParams.get('committee') || '',
      sponsor: searchParams.get('sponsor') || '',
      subject: searchParams.getAll('subject'),
      bill_type: searchParams.getAll('bill_type'),
      has_event: searchParams.get('has_event') || '',
      date_from: searchParams.get('date_from') || '',
      date_to: searchParams.get('date_to') || '',
      sort: searchParams.get('sort') || 'date_desc',
    }
    setQuery(urlQuery)
    setFilters(urlFilters)
    setPage(urlPage)
    setPageSize(urlLimit)
  }, [searchParams])

  // Initial search on mount
  useEffect(() => {
    performSearch(query, filters, page, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q)
      const newPage = 1
      setPage(newPage)

      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current)
      queryDebounceRef.current = setTimeout(() => {
        const qs = buildRouterParams(q, filters, newPage, pageSize)
        router.replace(qs ? `/?${qs}` : '/', { scroll: false })
        performSearch(q, filters, newPage, pageSize)
      }, 300)
    },
    [filters, pageSize, performSearch, router]
  )

  const handleFiltersChange = useCallback(
    (f: SearchFilterState) => {
      setFilters(f)
      const newPage = 1
      setPage(newPage)

      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
      filterDebounceRef.current = setTimeout(() => {
        const qs = buildRouterParams(query, f, newPage, pageSize)
        router.replace(qs ? `/?${qs}` : '/', { scroll: false })
        performSearch(query, f, newPage, pageSize)
      }, 150)
    },
    [query, pageSize, performSearch, router]
  )

  const handlePageChange = useCallback(
    (p: number) => {
      setPage(p)
      const qs = buildRouterParams(query, filters, p, pageSize)
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
      performSearch(query, filters, p, pageSize)
      // Scroll to top of results section
      document.getElementById('bills')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [query, filters, pageSize, performSearch, router]
  )

  const handlePageSizeChange = useCallback(
    (s: number) => {
      setPageSize(s)
      const newPage = 1
      setPage(newPage)
      const qs = buildRouterParams(query, filters, newPage, s)
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
      performSearch(query, filters, newPage, s)
    },
    [query, filters, performSearch, router]
  )

  const handleReset = useCallback(() => {
    setQuery('')
    setFilters(EMPTY_FILTERS)
    setPage(1)
    router.replace('/', { scroll: false })
    performSearch('', EMPTY_FILTERS, 1, pageSize)
  }, [pageSize, performSearch, router])

  const hasFilters = !filtersAreEmpty(filters)
  const activeFilterRecord: Record<string, string> = {}
  if (filters.chamber) activeFilterRecord.chamber = filters.chamber
  if (filters.status) activeFilterRecord.status = filters.status
  if (filters.committee) activeFilterRecord.committee = filters.committee
  if (filters.sponsor) activeFilterRecord.sponsor = filters.sponsor

  const headingText = query
    ? `Search Results (${total.toLocaleString()}) for "${query}"`
    : hasFilters
    ? `Filtered Bills (${total.toLocaleString()})`
    : `All Bills (${total.toLocaleString()})`

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div>
      <SearchBar
        initialQuery={query}
        totalResults={total}
        activeFilters={activeFilterRecord}
        onSearch={handleQueryChange}
      />

      <SearchFilters
        filters={filters}
        onChange={handleFiltersChange}
        hasQuery={!!query}
        totalResults={total}
      />

      <div style={{
        marginTop: '16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--navy)',
          margin: 0,
        }}>
          {headingText}
        </h2>
        {!loading && total > 0 && (
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}>
            Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} bills
          </div>
        )}
      </div>

      <SearchResults
        results={results}
        total={total}
        page={page}
        totalPages={totalPages}
        query={query}
        loading={loading}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onReset={handleReset}
      />
    </div>
  )
}
