/**
 * GitHub OAuth Callback
 *
 * GET /api/auth/github/callback
 *
 * Handles GitHub OAuth callback: verifies state (CSRF), fetches user,
 * creates/links user in DB, creates session, stores OAuth connection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { githubService } from '@/lib/integrations/github'
import { verifyState } from '@/lib/auth/oauth-state'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { getAppUrl } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error)}`, getAppUrl())
      )
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', getAppUrl()))
    }

    const validState = await verifyState(state)
    if (!validState) {
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_state', getAppUrl())
      )
    }

    const accessToken = await githubService.exchangeCodeForToken(code)
    githubService.initialize(accessToken)
    const githubUser = await githubService.getUser()

    const providerId = String(githubUser.id)
    const email = githubUser.email || `${githubUser.login}@users.noreply.github.com`
    const emailNorm = email.toLowerCase().trim()
    const name = githubUser.name || githubUser.login

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailNorm },
          {
            oauthConnections: {
              some: { provider: 'github', providerId },
            },
          },
        ],
      },
    })

    if (!user) {
      const passwordHash = await bcrypt.hash(
        `oauth_${crypto.randomUUID?.() ?? Date.now()}`,
        10
      )
      user = await prisma.user.create({
        data: {
          email: emailNorm,
          name,
          passwordHash,
          avatar: githubUser.avatar_url || null,
        },
      })
    } else if (!user.avatar && githubUser.avatar_url) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: githubUser.avatar_url },
      })
      user = { ...user, avatar: githubUser.avatar_url }
    }

    await prisma.oAuthConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: 'github' },
      },
      create: {
        userId: user.id,
        provider: 'github',
        providerId,
        accessToken,
        metadata: {
          login: githubUser.login,
          avatar_url: githubUser.avatar_url,
        },
      },
      update: {
        accessToken,
        metadata: {
          login: githubUser.login,
          avatar_url: githubUser.avatar_url,
        },
      },
    })

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.redirect(new URL('/dashboard?github_connected=true', getAppUrl()))
  } catch (e) {
    console.error('GitHub OAuth callback error:', e)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent('oauth_failed')}`, getAppUrl())
    )
  }
}
