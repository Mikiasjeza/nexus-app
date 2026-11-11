/**
 * GET /api/auth/oauth/{google|microsoft|linkedin}/authorize
 *
 * Starts "Continue with …": remembers the round trip in an HTTP-only cookie
 * and sends the person to the provider. With ?mode=connect it links the
 * provider to the account that is already signed in (Settings) instead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/config/env'
import { getSessionUserId } from '@/lib/auth/session'
import { saveOAuthFlow } from '@/lib/auth/oauth-state'
import { getSignInProvider, providerCredentials } from '@/lib/auth/oauth/providers'
import { startAuthorization } from '@/lib/auth/oauth/flow'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const appUrl = getAppUrl()
  const to = (path: string) => NextResponse.redirect(new URL(path, appUrl))

  try {
    const { provider: id } = await params
    const provider = getSignInProvider(id)
    if (!provider || !providerCredentials(provider)) {
      return to('/auth/login?error=oauth_unavailable')
    }

    // The cookie belongs to one host and the provider sends people back to the
    // site's main address, so the sign-in has to start there too.
    const canonical = new URL(appUrl)
    const { hostname, pathname, search, searchParams } = request.nextUrl
    if (hostname !== canonical.hostname) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, canonical))
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(`auth:oauth-start:${ip}`, { maxRequests: 20, windowMs: 60_000 }).allowed) {
      return to('/auth/login?error=oauth_rate_limited')
    }

    const connect = searchParams.get('mode') === 'connect'
    let userId: string | null = null
    if (connect) {
      userId = await getSessionUserId()
      if (!userId) return to('/auth/login?next=%2Fsettings')
    }

    const next = searchParams.get('next')
    const { url, flow } = startAuthorization(provider, {
      mode: connect ? 'connect' : 'signin',
      userId,
      next: next ? safeNextPath(next) : null,
    })
    await saveOAuthFlow(flow)
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('OAuth authorize error:', error)
    return to('/auth/login?error=oauth_failed')
  }
}
