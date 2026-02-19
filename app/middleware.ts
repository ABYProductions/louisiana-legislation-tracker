import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (pathname.startsWith('/beta-login') || pathname.startsWith('/api/beta-auth')) {
    return NextResponse.next()
  }

  // Check for valid beta cookie
  const betaCookie = request.cookies.get('beta_access')?.value

  if (!betaCookie || betaCookie !== 'granted') {
    const loginUrl = new URL('/beta-login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
