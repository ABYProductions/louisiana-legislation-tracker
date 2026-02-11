import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function UpcomingEventsWidget() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch upcoming floor sessions
  const { data: floorSessions } = await supabase
    .from('floor_sessions')
    .select('*')
    .gte('session_date', today)
    .lte('session_date', sevenDaysFromNow)
    .order('session_date', { ascending: true })

  // Fetch upcoming committee meetings
  const { data: committeeMeetings } = await supabase
    .from('committee_meetings')
    .select('*')
    .gte('meeting_date', today)
    .lte('meeting_date', sevenDaysFromNow)
    .order('meeting_date', { ascending: true })

  // Fetch session events
  const { data: sessionEvents } = await supabase
    .from('session_events')
    .select('*')
    .gte('event_date', today)
    .lte('event_date', sevenDaysFromNow)
    .order('event_date', { ascending: true })

  // Combine all events
  const allEvents = [
    ...(floorSessions || []).map(s => ({
      date: s.session_date,
      time: s.session_time,
      title: `${s.chamber} Floor Session`,
      type: 'floor_session' as const,
      chamber: s.chamber,
      location: s.location,
      status: s.status
    })),
    ...(committeeMeetings || []).map(m => ({
      date: m.meeting_date,
      time: m.meeting_time,
      title: m.committee_name,
      type: 'committee_meeting' as const,
      chamber: m.chamber,
      location: m.location,
      status: m.status
    })),
    ...(sessionEvents || []).map(e => ({
      date: e.event_date,
      time: e.event_time,
      title: e.event_name,
      type: 'session_event' as const,
      chamber: null,
      location: e.location,
      status: null
    }))
  ].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })

  // Get today's events and upcoming events
  const todayEvents = allEvents.filter(e => e.date === today)
  const upcomingEvents = allEvents.filter(e => e.date > today).slice(0, 6)

  if (allEvents.length === 0) {
    return null // Don't show widget if no events
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#0C2340] shadow-lg mb-8 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C2340] to-[#1a3a5c] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FDD023] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0C2340]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Upcoming Legislative Activity
              </h2>
              <p className="text-blue-200 text-sm">
                Next 7 Days
              </p>
            </div>
          </div>
          <Link
            href="/calendar"
            className="px-4 py-2 bg-[#FDD023] text-[#0C2340] rounded-lg font-semibold text-sm hover:bg-[#FFDB4D] transition-colors"
          >
            View Full Calendar
          </Link>
        </div>
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="border-b border-slate-200 bg-yellow-50">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-[#FDD023] text-[#0C2340] rounded-full text-xs font-bold">
                TODAY
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="space-y-3">
              {todayEvents.map((event, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex-shrink-0 w-16 text-center">
                    {event.time ? (
                      <div className="text-sm font-bold text-[#0C2340]">
                        {event.time}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        All Day
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        event.type === 'floor_session' ? 'bg-blue-100 text-blue-700' :
                        event.type === 'committee_meeting' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {event.type === 'floor_session' ? 'Floor' :
                         event.type === 'committee_meeting' ? 'Committee' :
                         'Event'}
                      </span>
                      {event.chamber && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                          {event.chamber}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {event.title}
                    </h4>
                    {event.location && (
                      <p className="text-xs text-slate-500 mt-1">
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
            Coming Up
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event, idx) => {
              const eventDate = new Date(event.date + 'T00:00:00')
              const isTomorrow = event.date === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              
              return (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:border-[#0C2340] hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    {/* Date Box */}
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="bg-[#0C2340] text-white rounded-lg p-2">
                        <div className="text-xs font-semibold uppercase">
                          {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-bold">
                          {eventDate.getDate()}
                        </div>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      {isTomorrow && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold mb-2">
                          Tomorrow
                        </span>
                      )}
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          event.type === 'floor_session' ? 'bg-blue-100 text-blue-700' :
                          event.type === 'committee_meeting' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {event.type === 'floor_session' ? 'Floor' :
                           event.type === 'committee_meeting' ? 'Committee' :
                           'Event'}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">
                        {event.title}
                      </h4>

                      {event.time && (
                        <p className="text-xs text-slate-600 font-medium">
                          {event.time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">
            <span className="font-semibold text-[#0C2340]">{allEvents.length}</span> events in the next 7 days
          </div>
          <Link
            href="/calendar"
            className="text-[#0C2340] hover:text-[#FDD023] font-semibold flex items-center gap-1"
          >
            See All Events
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}