import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BillScheduleTimelineProps {
  billId: number
}

export default async function BillScheduleTimeline({ billId }: BillScheduleTimelineProps) {
  // Fetch past events (bill_events table)
  const { data: pastEvents } = await supabase
    .from('bill_events')
    .select('*')
    .eq('bill_id', billId)
    .order('event_date', { ascending: true })

  // Fetch future scheduled events (bill_schedule table)
  const { data: futureEvents } = await supabase
    .from('bill_schedule')
    .select('*')
    .eq('bill_id', billId)
    .order('scheduled_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  // Combine and sort all events
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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-500 text-sm">
          No timeline events available for this bill
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-[#0C2340] mb-6">
        Bill Timeline
      </h3>

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {allEvents.map((event, idx) => {
            const isToday = event.date === today
            const isFuture = event.date > today
            
            return (
              <div key={idx} className="relative pl-10">
                {/* Timeline dot */}
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

                {/* Event content */}
                <div className={`pb-2 ${isFuture && !isToday ? 'opacity-75' : ''}`}>
                  {/* Date */}
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

                  {/* Event type badge */}
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

                  {/* Description */}
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Location */}
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

      {/* Future events summary */}
      {futureEvents && futureEvents.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-[#0C2340]">
                {futureEvents.filter(e => e.scheduled_date >= today).length}
              </span>{' '}
              upcoming event(s) scheduled
            </div>
            <Link
              href="/calendar"
              className="text-sm text-[#0C2340] hover:text-[#FDD023] font-semibold"
            >
              View Full Calendar →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}