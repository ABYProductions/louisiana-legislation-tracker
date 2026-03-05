import { getSupabaseServiceRole } from '@/lib/supabase'

export async function logActivity(
  userId: string,
  eventType: string,
  eventDetail: string,
  billId?: number
): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole()
    await supabase.from('user_activity_log').insert({
      user_id:      userId,
      event_type:   eventType,
      event_detail: eventDetail,
      bill_id:      billId || null,
    })
  } catch (err) {
    console.error('Activity log error:', err)
    // Never throw — logging failure should never break main flow
  }
}
