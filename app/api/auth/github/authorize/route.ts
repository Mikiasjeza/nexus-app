import { NextResponse } from 'next/server'
import { githubService } from '@/lib/integrations/github'
import { generateState, setStateCookie } from '@/lib/auth/oauth-state'
import { getSessionUserId } from '@/lib/auth/session'
import { getAppUrl } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/github/authorize
 * Starts "Connect GitHub" for the signed-in account: sets the state cookie and
 * redirects to GitHub. GitHub is not a sign-in method, so there must already
 * be a session.
 */
export async function GET() {
  const to = (path: string) => NextResponse.redirect(new URL(path, getAppUrl()))
  try {
    if (!(await getSessionUserId())) {
      return to('/auth/login?error=github_signin_removed')
    }
    const state = generateState()
    await setStateCookie(state)
    return NextResponse.redirect(githubService.getAuthUrl(state))
  } catch (e) {
    console.error('GitHub authorize error:', e)
    return to('/settings?github=failed')
  }
}
