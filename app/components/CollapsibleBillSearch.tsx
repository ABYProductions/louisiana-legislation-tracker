'use client'

import { useState } from 'react'
import BillSearch from './BillSearch'
import type { SearchFilterState } from './SearchFilters'

interface Props {
  initialQuery: string
  initialFilters: SearchFilterState
}

export default function CollapsibleBillSearch({ initialQuery, initialFilters }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--navy)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
        }}>
          Bill Search
        </span>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--gold)',
            fontWeight: 600,
            padding: 0,
          }}
        >
          {collapsed ? '▼ Expand Search' : '▲ Minimize'}
        </button>
      </div>

      {!collapsed && (
        <BillSearch
          initialQuery={initialQuery}
          initialFilters={initialFilters}
          hideSearchBar
        />
      )}
    </>
  )
}
