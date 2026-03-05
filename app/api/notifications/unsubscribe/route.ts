import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse(errorPage('Missing unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  let userId: string
  try {
    userId = Buffer.from(token, 'base64url').toString('utf8')
    if (!userId || userId.length < 10) throw new Error('invalid')
  } catch {
    return new NextResponse(errorPage('Invalid unsubscribe link.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const admin = getSupabaseServiceRole()
  const { error } = await admin
    .from('notification_preferences')
    .update({ email_opt_in: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return new NextResponse(errorPage('Could not process your unsubscribe request. Please try again.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return new NextResponse(successPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function successPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribed — SessionSource</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f2; margin: 0; padding: 40px 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: white; border-radius: 12px; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .icon { width: 56px; height: 56px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  h1 { font-size: 22px; font-weight: 700; color: #1a2744; margin: 0 0 10px; }
  p { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
  a { display: inline-block; margin-top: 8px; padding: 10px 24px; background: #1a2744; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>
  <h1>You've been unsubscribed</h1>
  <p>You'll no longer receive email digests or alerts from SessionSource.</p>
  <p>You can re-enable emails at any time from your account notification settings.</p>
  <a href="https://sessionsource.net/account">Manage Account Settings</a>
</div>
</body>
</html>`
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Error — SessionSource</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f2; margin: 0; padding: 40px 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: white; border-radius: 12px; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  h1 { font-size: 22px; font-weight: 700; color: #1a2744; margin: 0 0 10px; }
  p { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
  a { display: inline-block; margin-top: 8px; padding: 10px 24px; background: #1a2744; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; }
</style>
</head>
<body>
<div class="card">
  <h1>Something went wrong</h1>
  <p>${message}</p>
  <a href="https://sessionsource.net">Return to SessionSource</a>
</div>
</body>
</html>`
}
