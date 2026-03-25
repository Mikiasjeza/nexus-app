/**
 * Global auth guard - protects all routes except public ones.
 * Public: Landing, marketing, auth, share
 * Protected: Dashboard, profile, app tools, payments, settings, onboarding
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/config/env'

/** Routes that do NOT require authentication */
const PUBLIC_PATHS = [
  '/',                    // Landing
  '/about',
  '/how-it-works',
  '/contact',
  '/pricing',
  '/terms',
  '/privacy',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/share/',              // Public shareable profiles
  '/api/health',
  '/api/version',
  '/api/guest-mode',
  '/api/auth/',           // Login, register, etc. handle own auth
  '/api/stripe/webhook',  // Stripe webhooks (verified by signature)
  '/api/share/',          // Public share API
  '/api/jobs',            // Public job listings for marketplace
  '/api/company/',        // Public company profiles
  '/sentry-example-page', // Sentry test page (dev/verification)
  '/api/sentry-example-api', // Sentry test API (used by example page)
]

/** Auth routes - redirect to dashboard if already logged in */
const AUTH_ROUTES = ['/auth/login', '/auth/register']

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(p => pathname.startsWith(p))
}

export function proxy(request: NextRequest) {
  const guestPreview = request.cookies.get('nexus_guest_preview')?.value === 'true'

  if (env.isGuestMode || guestPreview) {
    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl
  const sessionToken = request.cookies.get('nexus_session')?.value

  // Public routes - allow
  if (isPublicPath(pathname)) {
    // If logged in and visiting auth page, redirect to dashboard
    if (sessionToken && isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes - require auth
  if (!sessionToken) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${search || ''}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and _next
     */
    '/((?!_next/static|_next/image|favicon.ico|og-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
