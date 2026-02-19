import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BillScheduleTimelineProps {
  billId: number
  billNumber?: string
}

function getOfficialBillUrl(billNumber: string) {
  const cleanNumber = billNumber.replace(/\s+/g, '')
  return `https://legis.la.gov/legis/BillInfo.aspx?s=26RS&b=${cleanNumber}&sbi=y`
}

export default async function BillScheduleTimeline({ billId, billNumber }: BillScheduleTimelineProps) {
  const { data: pastEvents } = await supabase
    .from('bill_events')
    .select('*')
    .eq('bill_id', billId)
    .order('event_date', { ascending: true })

  const { data: futureEvents } = await supabase
    .from('bill_schedule')
    .select('*')
    .eq('bill_id', billId)
    .order('scheduled_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  const allEvents = [
    ...(pastEvents || []).map(e => ({
      date: e.event_date,
      type: e.event_type,
      description: e.description,
      chamber: e.chamber,
      vote_result: e.vote_result,
      isPast: true,
      time: null,
      location: null,
      action_expected: null
    })),
    ...(futureEvents || []).map(e => ({
      date: e.scheduled_date,
      type: e.event_type,
      description: e.action_expected || e.notes || 'Scheduled event',
      chamber: null,
      vote_result: null,
      isPast: e.scheduled_date < today,
      time: e.scheduled_time,
      location: e.location,
      action_expected: e.action_expected
    }))
  ].sort((a, b) => a.date.localeCompare(b.date))

  if (allEvents.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#0C2340] mb-4">
          Bill Schedule
        </h3>
        <p className="text-slate-500 text-sm text-center py-4">
          No timeline events available for this bill
        </p>
        {billNumber && (
          <a
            href={getOfficialBillUrl(billNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-center text-sm text-[#0C2340] hover:text-[#FDD023] font-semibold"
          >
            View Official Bill Page →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#0C2340]">
          Bill Schedule
        </h3>
        {billNumber && (
          <a
            href={getOfficialBillUrl(billNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#0C2340] hover:text-[#FDD023] font-semibold flex items-center gap-1"
          >
            Official Page
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {allEvents.map((event, idx) => {
            const isToday = event.date === today
            const isFuture = event.date > today
            
            return (
              <div key={idx} className="relative pl-10">
                <div 
                  className={`absolute left-0 w-8 h-8 rounded-full border-4 flex items-center justify-center ${
                    isToday 
                      ? 'bg-[#FDD023] border-[#0C2340]' 
                      : isFuture
                      ? 'bg-white border-slate-300'
                      : 'bg-[#0C2340] border-[#0C2340]'
                  }`}
                >
                  {isToday && (
                    <div className="w-3 h-3 bg-[#0C2340] rounded-full" />
                  )}
                  {!isToday && !isFuture && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className={`pb-2 ${isFuture && !isToday ? 'opacity-75' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`text-sm font-semibold ${
                      isToday ? 'text-[#FDD023]' : 
                      isFuture ? 'text-slate-600' : 
                      'text-[#0C2340]'
                    }`}>
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    
                    {isToday && (
                      <span className="px-2 py-0.5 bg-[#FDD023] text-[#0C2340] text-xs font-bold rounded-full">
                        TODAY
                      </span>
                    )}
                    
                    {isFuture && !isToday && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        UPCOMING
                      </span>
                    )}

                    {event.time && (
                      <span className="text-xs text-slate-500">
                        {event.time}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      event.type === 'introduced' ? 'bg-green-100 text-green-700' :
                      event.type === 'committee_passed' ? 'bg-blue-100 text-blue-700' :
                      event.type === 'floor_vote' ? 'bg-purple-100 text-purple-700' :
                      event.type === 'committee_meeting' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {event.type.replace('_', ' ').toUpperCase()}
                    </span>

                    {event.chamber && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {event.chamber}
                      </span>
                    )}

                    {event.vote_result && (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        event.vote_result === 'passed' ? 'bg-green-100 text-green-700' :
                        event.vote_result === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {event.vote_result.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {event.description}
                  </p>

                  {event.location && (
                    <p className="text-xs text-slate-500 mt-1">
                      Location: {event.location}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
        {futureEvents && futureEvents.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-600">
              <span className="font-semibold text-[#0C2340]">
                {futureEvents.filter(e => e.scheduled_date >= today).length}
              </span>{' '}
              upcoming event(s)
            </div>
            <Link
              href="/calendar"
              className="text-[#0C2340] hover:text-[#FDD023] font-semibold"
            >
              View Calendar →
            </Link>
          </div>
        )}
        
        {billNumber && (
          <a
            href={getOfficialBillUrl(billNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#0C2340] text-white rounded-lg text-sm font-semibold hover:bg-[#1a3a5c] transition-colors"
          >
            View Full Bill Details on legis.la.gov
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
