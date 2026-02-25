export default function SummaryPending() {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--navy)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--gold)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--navy)' }}>Analysis Pending</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            SessionSource is preparing a comprehensive legal analysis for this bill. Our AI legislative counsel generates professional summaries as soon as bill text becomes publicly available through the Louisiana Legislature. If this bill was recently introduced, its full text may not yet be available in the official legislative record. Please check back within 24 hours for a complete analysis.
          </p>
        </div>
      </div>
    </div>
  )
}
