/**
 * Global auth guard - protects all routes except public ones.
 * Public: Landing, marketing, auth, share
 * Protected: Dashboard, profile, app tools, payments, settings, onboarding
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/config/env'
import { isPrelaunchPublic, prelaunchEnabled } from '@/lib/prelaunch'

/** Routes that do NOT require authentication */
const PUBLIC_PATHS = [
  '/', // Landing
  '/coming-soon', // Pre-launch page (also reachable directly)
  '/api/waitlist/', // Launch waitlist: join, confirm, unsubscribe
  '/about',
  '/how-it-works',
  '/contact',
  '/pricing',
  '/employers', // Public page for the hiring side
  '/employer/invite', // Team invite link; signed-out visitors are offered sign-in
  '/terms',
  '/privacy',
  '/cookies',
  '/ai',
  '/accessibility',
  '/copyright',
  '/security',
  '/.well-known/', // security.txt
  '/monitoring', // Sentry tunnel: error reports from logged-out pages too
  '/_vercel/', // Vercel Web Analytics (only loads with consent)
  '/status', // Public status page
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email', // Link from the confirmation email
  '/auth/two-factor', // Second sign-in step, before a session exists
  '/share/', // Public shareable profiles
  '/assessments', // Catalog, details and practice rounds (attempts are below)
  '/verify', // Public credential checks
  '/api/verify/',
  '/api/assessments', // Each route checks its own auth and answers 401 as JSON
  '/api/health',
  '/api/version',
  '/api/contact',
  '/api/guest-mode',
  '/api/auth/', // Login, register, etc. handle own auth
  '/api/stripe/webhook', // Stripe webhooks (verified by signature)
  '/api/billing/plans', // Pricing page data; signed-in details only with a session
  '/api/cron/', // Vercel Cron, authorized by CRON_SECRET in the route
  '/api/share/', // Public share API
  '/api/jobs', // Public job listings for marketplace
  '/api/company/', // Public company profiles
]

/** Auth routes - redirect to dashboard if already logged in */
const AUTH_ROUTES = ['/auth/login', '/auth/register']

/** Inside a public prefix but still for signed-in people only. */
const PROTECTED_PATHS = ['/assessments/attempt/', '/assessments/result/', '/assessments/report/']

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) return false
  return PUBLIC_PATHS.some((p) => p !== '/' && (pathname === p || pathname.startsWith(p)))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname.startsWith(p))
}

/**
 * Pre-launch mode: the homepage shows Coming Soon, public pages stay open,
 * and everything else needs a signed-in account. Whether that account may
 * actually use the app (admin, allowlist, paying customer) is decided on the
 * server in getSessionUserId and the root layout, not here.
 */
function prelaunchProxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const headers = new Headers(request.headers)
  headers.set('x-nexus-path', pathname)
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/coming-soon', request.url), { request: { headers } })
  }
  if (isPrelaunchPublic(pathname)) return NextResponse.next({ request: { headers } })
  if (!request.cookies.get('nexus_session')?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nexus isn’t open yet.' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/coming-soon', request.url))
  }
  return NextResponse.next({ request: { headers } })
}

export function proxy(request: NextRequest) {
  if (prelaunchEnabled()) return prelaunchProxy(request)

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
