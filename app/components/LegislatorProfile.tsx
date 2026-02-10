interface LegislatorProfileProps {
  legislator: {
    name: string
    party: string
    district: string
    photo: string | null
    termInfo: string
    committees: string[]
    career: string
  }
  billCount: number
}

export default function LegislatorProfile({ legislator, billCount }: LegislatorProfileProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0C2340] to-[#1a3a5c] p-8 text-white">
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border-4 border-[#FDD023]">
            <span className="text-5xl font-bold text-white">
              {legislator.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{legislator.name}</h1>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="px-3 py-1 bg-[#FDD023] text-[#0C2340] rounded-full text-sm font-semibold">
                {legislator.party}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                {billCount} Bills This Session
              </span>
            </div>
            <p className="text-blue-100 text-sm">
              Profile data sourced from public legislative records. Photo and detailed biographical information may not be available for all legislators.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                District
              </h3>
              <p className="text-slate-900">{legislator.district}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Term Information
              </h3>
              <p className="text-slate-900">{legislator.termInfo}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Committee Affiliations
              </h3>
              {legislator.committees.length > 0 ? (
                <ul className="space-y-1">
                  {legislator.committees.map((committee, i) => (
                    <li key={i} className="text-slate-900">{committee}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 italic">Committee information not available</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Career Background
              </h3>
              <p className="text-slate-900">{legislator.career}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Data Availability:</strong> Comprehensive legislator profiles require integration with Louisiana Legislature APIs and public records databases. The information displayed here is limited to data available in our current bill tracking system. For complete and official information, please visit the Louisiana State Legislature website.
          </p>
        </div>
      </div>
    </div>
  )
}