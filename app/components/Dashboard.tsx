import { Suspense } from 'react'
import CollapsibleBillSearch from './CollapsibleBillSearch'
import WatchlistSidebarPanel from './WatchlistSidebarPanel'
import NewsWidget from './NewsWidget'
import SubjectHeatmap from './SubjectHeatmap'
import SessionTimeline from './SessionTimeline'
import type { SearchFilterState } from './SearchFilters'

interface DashboardProps {
  initialQuery: string
  initialFilters: SearchFilterState
}

export default function Dashboard({ initialQuery, initialFilters }: DashboardProps) {
  return (
    <div
      className="dashboard-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '62fr 38fr',
        gap: 'var(--space-8)',
        alignItems: 'start',
        padding: 'var(--space-8) 0 var(--space-16)',
      }}
    >
      {/* Left column: bill list */}
      <div id="bills">
        <Suspense fallback={
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
            padding: 'var(--space-8) 0',
          }}>
            Loading bills...
          </div>
        }>
          <CollapsibleBillSearch
            initialQuery={initialQuery}
            initialFilters={initialFilters}
          />
        </Suspense>
      </div>

      {/* Right column: sticky sidebar */}
      <aside
        className="dashboard-sidebar"
        style={{
          position: 'sticky',
          top: '80px',
          maxHeight: 'calc(100vh - 88px)',
          overflowY: 'auto',
          alignSelf: 'start',
        }}
      >
        <WatchlistSidebarPanel />
        <NewsWidget embedded />
        <SubjectHeatmap compact />
        <SessionTimeline />
      </aside>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
          .dashboard-sidebar {
            position: static !important;
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  )
}
