/**
 * GET /api/auth/oauth/{google|microsoft|linkedin}/callback
 *
 * Where the provider sends people back. Checks the answer belongs to the
 * sign-in this browser started, reads the person's profile, then signs them
 * in, creates their account, or links the provider to the signed-in account.
 * Who gets which account is decided in lib/auth/oauth/account.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAppUrl } from '@/lib/config/env'
import {
  clearGuestPreviewCookie,
  createSession,
  getSessionUserId,
  setSessionCookie,
} from '@/lib/auth/session'
import { takeOAuthFlow } from '@/lib/auth/oauth-state'
import { getSignInProvider, providerCredentials } from '@/lib/auth/oauth/providers'
import { completeAuthorization } from '@/lib/auth/oauth/flow'
import { connectProvider, signInWithProvider } from '@/lib/auth/oauth/account'
import { OAuthError, safeEqual } from '@/lib/auth/oauth/id-token'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import { rateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

/** What each provider sends when the person closes or declines its screen. */
const CANCELLED = new Set(['access_denied', 'user_cancelled_login', 'user_cancelled_authorize'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const appUrl = getAppUrl()
  const to = (path: string) => NextResponse.redirect(new URL(path, appUrl))
  const { provider: id } = await params
  const provider = getSignInProvider(id)

  // Read (and clear) the flow first: the cookie is single-use whatever happens next.
  const flow = await takeOAuthFlow().catch(() => null)
  const connecting = flow?.mode === 'connect'
  const fail = (code: string) => {
    const query = new URLSearchParams(connecting ? { connect_error: code } : { error: code })
    if (provider) query.set('provider', provider.id)
    return to(`${connecting ? '/settings' : '/auth/login'}?${query}`)
  }

  if (!provider || !providerCredentials(provider)) return fail('oauth_unavailable')

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(`auth:oauth-callback:${ip}`, { maxRequests: 20, windowMs: 60_000 }).allowed) {
      return fail('oauth_rate_limited')
    }

    const query = request.nextUrl.searchParams
    const state = query.get('state')
    if (!flow || flow.provider !== provider.id || !state || !safeEqual(flow.state, state)) {
      return fail('invalid_state')
    }

    const providerError = query.get('error')
    if (providerError)
      return fail(CANCELLED.has(providerError) ? 'oauth_cancelled' : 'oauth_failed')

    const code = query.get('code')
    if (!code) return fail('oauth_failed')

    const profile = await completeAuthorization(provider, flow, code)

    if (flow.mode === 'connect') {
      // The account comes from the live session. The cookie only confirms it is
      // still the one that started the link; it is never trusted on its own.
      const userId = await getSessionUserId()
      if (!userId || userId !== flow.userId) return fail('session_changed')
      const outcome = await connectProvider(userId, provider.id, profile)
      if (outcome.kind === 'refused') return fail(outcome.reason)
      return to(`/settings?connected=${provider.id}`)
    }

    const outcome = await signInWithProvider(provider.id, profile)
    if (outcome.kind === 'refused') return fail(outcome.reason)

    const token = await createSession(outcome.userId)
    await clearGuestPreviewCookie()
    await setSessionCookie(token)
    return to(outcome.onboardingComplete ? safeNextPath(flow.next) : '/onboarding')
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'unexpected'
    console.error(`OAuth callback error (${provider.id}):`, error)
    Sentry.logger.error('OAuth sign-in failed', {
      route: 'api/auth/oauth/callback',
      provider: provider.id,
      code,
      errorMessage: error instanceof Error ? error.message : 'unknown',
    })
    return fail('oauth_failed')
  }
}
