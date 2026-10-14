/**
 * GitHub OAuth Callback
 *
 * GET /api/auth/github/callback
 *
 * Verifies state (CSRF), then either:
 * - links GitHub to the currently signed-in account (explicit "Connect GitHub"), or
 * - signs in the account already linked to this GitHub user ID, or
 * - creates a new account from the GitHub user's *verified* primary email.
 *
 * Security: accounts are matched by GitHub's immutable user ID only, never by
 * email. A GitHub login whose email matches an existing Nexus account is NOT
 * auto-linked (that allowed account takeover via unverified/attacker-chosen
 * GitHub emails); the owner must sign in with their password and connect
 * GitHub from Settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { githubService, githubClientFor } from '@/lib/integrations/github'
import { verifyState } from '@/lib/auth/oauth-state'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import {
  createSession,
  setSessionCookie,
  getSessionUserId,
  clearGuestPreviewCookie,
} from '@/lib/auth/session'
import { getAppUrl } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, getAppUrl()))
}

function loginError(code: string) {
  return redirectTo(`/auth/login?error=${encodeURIComponent(code)}`)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return loginError(error === 'access_denied' ? 'github_cancelled' : 'oauth_failed')
    }

    if (!code) {
      return loginError('oauth_failed')
    }

    const validState = await verifyState(state)
    if (!validState) {
      return loginError('invalid_state')
    }

    const accessToken = await githubService.exchangeCodeForToken(code)
    // Per-request client: the shared instance must not hold a user's token.
    const github = githubClientFor(accessToken)
    const githubUser = await github.getUser()
    const providerId = String(githubUser.id)
    const metadata = { login: githubUser.login }

    const existingConnection = await prisma.oAuthConnection.findFirst({
      where: { provider: 'github', providerId },
      select: { userId: true },
    })

    // 1. Signed in already → this is an explicit "Connect GitHub" from Settings.
    const currentUserId = await getSessionUserId()
    if (currentUserId) {
      if (existingConnection && existingConnection.userId !== currentUserId) {
        return redirectTo('/settings?github=already_linked')
      }
      await prisma.oAuthConnection.upsert({
        where: { userId_provider: { userId: currentUserId, provider: 'github' } },
        create: { userId: currentUserId, provider: 'github', providerId, metadata },
        update: { providerId, metadata },
      })
      return redirectTo('/settings?github=connected')
    }

    let userId: string

    if (existingConnection) {
      // 2. Returning GitHub user, matched by immutable GitHub ID.
      userId = existingConnection.userId
      await prisma.oAuthConnection.updateMany({
        where: { provider: 'github', providerId },
        data: { metadata },
      })
    } else {
      // 3. New account. Only a GitHub-verified email may be used.
      const email = await github.getVerifiedPrimaryEmail()
      if (!email) {
        return loginError('github_email_unverified')
      }

      const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (emailTaken) {
        return loginError('github_account_exists')
      }

      const passwordHash = await bcrypt.hash(`oauth_${crypto.randomUUID()}`, 10)
      try {
        const user = await prisma.user.create({
          data: {
            email,
            name: githubUser.name || githubUser.login,
            passwordHash,
            avatar: githubUser.avatar_url || null,
            emailVerified: true, // verified by GitHub
            oauthConnections: {
              create: { provider: 'github', providerId, metadata },
            },
          },
          select: { id: true },
        })
        userId = user.id
      } catch (e) {
        // Lost a race with a concurrent sign-up using the same email.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return loginError('github_account_exists')
        }
        throw e
      }
    }

    const token = await createSession(userId)
    await clearGuestPreviewCookie()
    await setSessionCookie(token)

    return redirectTo('/dashboard?github_connected=true')
  } catch (e) {
    console.error('GitHub OAuth callback error:', e)
    return loginError('oauth_failed')
  }
}
