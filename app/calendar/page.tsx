import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CalendarPage() {
  // Fetch all scheduling data
  const [sessionEvents, floorSessions, committeeMeetings] = await Promise.all([
    supabase.from('session_events').select('*').order('event_date', { ascending: true }),
    supabase.from('floor_sessions').select('*').order('session_date', { ascending: true }),
    supabase.from('committee_meetings').select('*').order('meeting_date', { ascending: true })
  ])

  // Get upcoming events (next 30 days)
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const upcomingFloor = floorSessions.data?.filter(s => s.session_date >= today && s.session_date <= thirtyDaysFromNow) || []
  const upcomingCommittees = committeeMeetings.data?.filter(m => m.meeting_date >= today && m.meeting_date <= thirtyDaysFromNow) || []

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-[#0C2340] hover:text-[#1a3a5c] mb-4 font-medium"
            >
              ← Back to All Bills
            </Link>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">📅</span>
              <div>
                <h1 className="text-4xl font-bold text-[#0C2340]">
                  Legislative Calendar
                </h1>
                <p className="text-slate-600 text-lg mt-2">
                  2026 Regular Session Schedule & Events
                </p>
              </div>
            </div>
          </div>

          {/* Session Events */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-[#0C2340] to-[#1a3a5c] rounded-2xl p-8 text-white mb-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="text-3xl">🏛️</span>
                Key Session Dates
              </h2>
              <p className="text-blue-100">
                Important deadlines and ceremonial events for the 2026 Regular Session
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sessionEvents.data?.map((event) => (
                <div key={event.id} className="bg-white rounded-xl border-2 border-[#FDD023] p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">
                      {event.event_type === 'opening_ceremony' && '🎉'}
                      {event.event_type === 'deadline' && '⏰'}
                      {event.event_type === 'recess' && '☕'}
                      {event.event_type === 'adjournment' && '🏁'}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#0C2340] text-lg mb-1">
                        {event.event_name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {event.event_time && ` at ${event.event_time}`}
                      </p>
                      {event.description && (
                        <p className="text-sm text-slate-700">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-slate-500 mt-2">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Floor Sessions */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-[#0C2340] mb-6 flex items-center gap-3">
                <span className="text-3xl">⚖️</span>
                Upcoming Floor Sessions (Next 30 Days)
              </h2>

              {upcomingFloor.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No floor sessions scheduled in the next 30 days
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingFloor.map((session) => (
                    <div key={session.id} className="border border-slate-200 rounded-xl p-6 hover:border-[#0C2340] transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              session.chamber === 'House' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {session.chamber}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                              {session.session_type}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              session.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                              session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {session.chamber} Floor Session
                          </h3>
                          
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>
                              <strong>📅 Date:</strong> {new Date(session.session_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {session.session_time && (
                              <p><strong>🕐 Time:</strong> {session.session_time}</p>
                            )}
                            {session.location && (
                              <p><strong>📍 Location:</strong> {session.location}</p>
                            )}
                          </div>
                          
                          {session.notes && (
                            <p className="text-sm text-slate-600 mt-2 italic">
                              {session.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Committee Meetings */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-[#0C2340] mb-6 flex items-center gap-3">
                <span className="text-3xl">👥</span>
                Upcoming Committee Meetings (Next 30 Days)
              </h2>

              {upcomingCommittees.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No committee meetings scheduled in the next 30 days
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingCommittees.map((meeting) => (
                    <div key={meeting.id} className="border border-slate-200 rounded-xl p-6 hover:border-[#0C2340] transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              meeting.chamber === 'House' 
                                ? 'bg-blue-100 text-blue-700' 
                                : meeting.chamber === 'Senate'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {meeting.chamber}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              meeting.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                              meeting.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {meeting.status}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {meeting.committee_name}
                          </h3>
                          
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>
                              <strong>📅 Date:</strong> {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {meeting.meeting_time && (
                              <p><strong>🕐 Time:</strong> {meeting.meeting_time}</p>
                            )}
                            {meeting.location && (
                              <p><strong>📍 Location:</strong> {meeting.location}</p>
                            )}
                            {meeting.chairman && (
                              <p><strong>👤 Chairman:</strong> {meeting.chairman}</p>
                            )}
                          </div>
                          
                          {meeting.notes && (
                            <p className="text-sm text-slate-600 mt-2 italic">
                              {meeting.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-[#0C2340] rounded-lg p-6">
            <p className="text-sm text-slate-700">
              <strong>Note:</strong> This calendar is updated in real-time as the Louisiana Legislature releases new scheduling information. For the most current official schedule, please visit <a href="https://legis.la.gov" target="_blank" rel="noopener noreferrer" className="text-[#0C2340] underline font-medium">legis.la.gov</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}