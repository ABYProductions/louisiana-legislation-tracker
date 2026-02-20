import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/beta-auth') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return response
  }

  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/beta-login')
  ) {
    return response
  }

  const betaToken = request.cookies.get('beta_access')
  if (!betaToken || betaToken.value !== 'granted') {
    return NextResponse.redirect(new URL('/beta-login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}