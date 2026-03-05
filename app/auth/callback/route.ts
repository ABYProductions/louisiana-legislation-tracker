import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const adoptToken = searchParams.get('adopt')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Check if this is a new signup by looking for existing user_profiles row
      const admin = getSupabaseServiceRole()
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        // New user — create profile row
        await admin.from('user_profiles').insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        await logActivity(user.id, 'account_created', 'Account created via email confirmation')

        // If there's an adopt token, go to watchlist to trigger adoption flow
        if (adoptToken) {
          return NextResponse.redirect(`${origin}/watchlist?adopt=${adoptToken}`)
        }
        // Otherwise trigger EmailOptInModal on the home page
        return NextResponse.redirect(`${origin}/?new_signup=true`)
      }

      await logActivity(user.id, 'login', 'Signed in via email link')
    }
  }

  // Forward adopt token to watchlist if present
  if (adoptToken) {
    return NextResponse.redirect(`${origin}/watchlist?adopt=${adoptToken}`)
  }

  return NextResponse.redirect(`${origin}/watchlist`)
}
