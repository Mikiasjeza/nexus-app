import { NextResponse } from 'next/server'
import { githubService } from '@/lib/integrations/github'
import { generateState, setStateCookie } from '@/lib/auth/oauth-state'
import { getAppUrl } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/github/authorize
 * Initiates GitHub OAuth flow: sets state cookie and redirects to GitHub.
 */
export async function GET() {
  try {
    const state = generateState()
    await setStateCookie(state)
    const authUrl = githubService.getAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (e) {
    console.error('GitHub authorize error:', e)
    return NextResponse.redirect(new URL('/auth/login?error=oauth_config', getAppUrl()))
  }
}
