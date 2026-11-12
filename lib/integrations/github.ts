/**
 * Linking a GitHub account (Settings → Connect GitHub), so repositories a
 * person submits as evidence can be confirmed as their own work. GitHub is
 * not a way to sign in; sign-in providers live in lib/auth/oauth.
 *
 * Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET; the OAuth app's callback URL
 * must be <app URL>/api/auth/github/callback (or GITHUB_REDIRECT_URI).
 * Repository evidence for skill verification lives in ./github-evidence.ts.
 */

import { Octokit } from 'octokit'
import { getAppUrl } from '@/lib/config/env'

/** Built with URL so a trailing slash on the app URL can't double up. */
function callbackUrl(): string {
  return (
    process.env.GITHUB_REDIRECT_URI || new URL('/api/auth/github/callback', getAppUrl()).toString()
  )
}

class GitHubService {
  private octokit: Octokit | null = null

  /**
   * Initialize GitHub client with access token
   */
  initialize(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    })
  }

  /**
   * Get authenticated GitHub user
   */
  async getUser(): Promise<{
    id: number
    login: string
    name: string | null
    email: string | null
    avatar_url: string
  }> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized')
    }
    const { data } = await this.octokit.rest.users.getAuthenticated()
    return {
      id: data.id,
      login: data.login,
      name: data.name ?? null,
      email: data.email ?? null,
      avatar_url: data.avatar_url ?? '',
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured')
    }

    const redirectUri = callbackUrl()
    // Least privilege: the public profile only, to learn the account's id and
    // username. No email (GitHub isn't used to sign in) and never `repo` (full
    // read/write to private code); public repos need no scope at all.
    const scope = 'read:user'

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`
  }

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = callbackUrl()

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured')
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error_description || data.error)
      }

      return data.access_token
    } catch (error) {
      console.error('GitHub OAuth error:', error)
      throw new Error(
        `Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

/**
 * Shared instance for token-less helpers (getAuthUrl, exchangeCodeForToken).
 * Never call initialize() on it in request handlers: it would swap the client
 * under concurrent requests. Use githubClientFor(token) instead.
 */
export const githubService = new GitHubService()

export function githubClientFor(accessToken: string): GitHubService {
  const client = new GitHubService()
  client.initialize(accessToken)
  return client
}
