/**
 * GitHub OAuth Callback
 *
 * GET /api/auth/github/callback
 *
 * Links a GitHub account to the account that is already signed in
 * (Settings → Connect GitHub), so repositories submitted as evidence can be
 * confirmed as that person's own work.
 *
 * GitHub is not a way to sign in or to create an account: a callback without
 * a session is turned away. Sign-in providers live in lib/auth/oauth.
 *
 * Security: the GitHub account is identified by its immutable user ID, and
 * the Nexus account by the live session, never by an email address.
 */

import { NextRequest, NextResponse } from 'next/server'
import { githubService, githubClientFor } from '@/lib/integrations/github'
import { verifyState } from '@/lib/auth/oauth-state'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { getAppUrl } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, getAppUrl()))
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const validState = await verifyState(state)

    const currentUserId = await getSessionUserId()
    if (!currentUserId) {
      return redirectTo('/auth/login?error=github_signin_removed')
    }

    if (error) {
      return redirectTo(`/settings?github=${error === 'access_denied' ? 'cancelled' : 'failed'}`)
    }
    if (!code || !validState) {
      return redirectTo('/settings?github=failed')
    }

    const accessToken = await githubService.exchangeCodeForToken(code)
    // Per-request client: the shared instance must not hold a user's token.
    const githubUser = await githubClientFor(accessToken).getUser()
    const providerId = String(githubUser.id)
    const metadata = { login: githubUser.login }

    const existingConnection = await prisma.oAuthConnection.findFirst({
      where: { provider: 'github', providerId },
      select: { userId: true },
    })
    if (existingConnection && existingConnection.userId !== currentUserId) {
      return redirectTo('/settings?github=already_linked')
    }

    await prisma.oAuthConnection.upsert({
      where: { userId_provider: { userId: currentUserId, provider: 'github' } },
      create: { userId: currentUserId, provider: 'github', providerId, metadata },
      update: { providerId, metadata },
    })
    return redirectTo('/settings?github=connected')
  } catch (e) {
    console.error('GitHub OAuth callback error:', e)
    return redirectTo('/settings?github=failed')
  }
}
