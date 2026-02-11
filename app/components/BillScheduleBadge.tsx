import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BillScheduleBadgeProps {
  billId: number
}

export default async function BillScheduleBadge({ billId }: BillScheduleBadgeProps) {
  // Get next scheduled event
  const today = new Date().toISOString().split('T')[0]
  
  const { data: nextEvent } = await supabase
    .from('bill_schedule')
    .select('*')
    .eq('bill_id', billId)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .single()

  if (!nextEvent) {
    return null
  }

  const eventDate = new Date(nextEvent.scheduled_date + 'T00:00:00')
  const isToday = nextEvent.scheduled_date === today
  const isTomorrow = nextEvent.scheduled_date === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  return (
    <div className={`mt-3 px-3 py-2 rounded-lg border-l-4 text-xs ${
      isToday 
        ? 'bg-yellow-50 border-[#FDD023]' 
        : 'bg-blue-50 border-[#0C2340]'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`font-semibold mb-0.5 ${
            isToday ? 'text-[#0C2340]' : 'text-slate-700'
          }`}>
            {isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : 'UPCOMING'}
            {nextEvent.scheduled_time && ` at ${nextEvent.scheduled_time}`}
          </div>
          <div className="text-slate-600">
            {nextEvent.action_expected || nextEvent.event_type.replace('_', ' ')}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-[#0C2340]">
            {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}