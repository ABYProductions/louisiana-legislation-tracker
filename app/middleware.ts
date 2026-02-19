import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if user has beta access cookie
  const betaAccess = request.cookies.get('beta_access')
  
  // Public routes that don't require authentication
  const publicRoutes = ['/beta-login', '/api/beta-auth']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  // If trying to access protected route without beta access
  if (!isPublicRoute && !betaAccess) {
    return NextResponse.redirect(new URL('/beta-login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
