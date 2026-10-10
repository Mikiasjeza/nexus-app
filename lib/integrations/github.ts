/**
 * GitHub OAuth sign-in and account lookups.
 *
 * Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET; the OAuth app's callback URL
 * must be <app URL>/api/auth/github/callback (or GITHUB_REDIRECT_URI).
 * Repository evidence for skill verification lives in ./github-evidence.ts.
 */

import { Octokit } from 'octokit'

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
   * The user's primary email, but only if GitHub has verified it. The profile's
   * `email` field is user-editable and unverified, so it must never be used to
   * match or create accounts. Requires the `user:email` scope.
   */
  async getVerifiedPrimaryEmail(): Promise<string | null> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized')
    }
    const { data } = await this.octokit.rest.users.listEmailsForAuthenticatedUser({ per_page: 100 })
    const primary = data.find((e) => e.primary && e.verified)
    return primary ? primary.email.toLowerCase().trim() : null
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured')
    }

    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
    // Least privilege: profile + email only. Public repos are readable without
    // extra scopes; never request `repo` (full read/write to private code).
    const scope = 'read:user user:email'

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`
  }

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`

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
