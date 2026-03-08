import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/config/env'

const protectedPrefixes = [
  '/dashboard',
  '/skills',
  '/verification',
  '/analytics',
  '/settings',
  '/marketplace',
  '/pricing',
]

const authPrefixes = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
  if (env.isGuestMode) {
    return NextResponse.next()
  }
  const { pathname, search } = request.nextUrl
  const sessionToken = request.cookies.get('nexus_session')?.value

  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  const isAuthRoute = authPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/auth/login', request.url)
    const nextPath = `${pathname}${search || ''}`
    loginUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(loginUrl)
  }

  // Avoid stale-cookie redirect loops by allowing auth routes to render.
  if (isAuthRoute && sessionToken) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/skills/:path*',
    '/verification/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/marketplace/:path*',
    '/pricing/:path*',
    '/auth/login',
    '/auth/register',
  ],
}
