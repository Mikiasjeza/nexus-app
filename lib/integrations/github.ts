/**
 * GitHub Integration
 * 
 * Analyzes GitHub repositories for skill evidence
 * 
 * TODO: Add GitHub OAuth app credentials to .env:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 * 
 * TODO: Configure OAuth callback URL
 * TODO: Add rate limiting for GitHub API
 */

import { Octokit } from 'octokit'

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description: string | null
  url: string
  language: string | null
  stars: number
  forks: number
  createdAt: string
  updatedAt: string
}

export interface GitHubCommit {
  sha: string
  message: string
  date: string
  author: string
  url: string
}

export interface GitHubAnalysis {
  repo: GitHubRepo
  commits: GitHubCommit[]
  languages: Record<string, number>
  totalCommits: number
  recentActivity: boolean
  skillEvidence: {
    languages: string[]
    frameworks: string[]
    tools: string[]
  }
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
   * Get user's repositories
   */
  async getUserRepos(username: string): Promise<GitHubRepo[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized. Call initialize() first.')
    }

    try {
      const { data } = await this.octokit.rest.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
      })

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description ?? null,
        url: repo.html_url,
        language: repo.language ?? null,
        stars: repo.stargazers_count ?? 0,
        forks: repo.forks_count ?? 0,
        createdAt: repo.created_at ?? '',
        updatedAt: repo.updated_at ?? '',
      }))
    } catch (error) {
      console.error('GitHub API error:', error)
      throw new Error(`Failed to fetch repositories: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze a repository for skill evidence
   */
  async analyzeRepo(owner: string, repo: string): Promise<GitHubAnalysis> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized')
    }

    try {
      // Get repo info
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      })

      // Get languages
      const { data: languagesData } = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      })

      // Get recent commits
      const { data: commitsData } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 30,
      })

      const commits: GitHubCommit[] = commitsData.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date || '',
        author: commit.commit.author?.name || '',
        url: commit.html_url,
      }))

      // Detect frameworks and tools from package.json, requirements.txt, etc.
      // TODO: Fetch and parse package.json, requirements.txt, etc.
      const frameworks: string[] = []
      const tools: string[] = []

      // Simple framework detection based on languages
      if (languagesData.JavaScript || languagesData.TypeScript) {
        frameworks.push('JavaScript/TypeScript')
      }
      if (languagesData.Python) {
        frameworks.push('Python')
      }
      if (languagesData.Java) {
        frameworks.push('Java')
      }

      const repoInfo: GitHubRepo = {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description ?? null,
        url: repoData.html_url,
        language: repoData.language ?? null,
        stars: repoData.stargazers_count ?? 0,
        forks: repoData.forks_count ?? 0,
        createdAt: repoData.created_at ?? '',
        updatedAt: repoData.updated_at ?? '',
      }

      // Check if repo has recent activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentActivity = new Date(repoInfo.updatedAt) > thirtyDaysAgo

      return {
        repo: repoInfo,
        commits,
        languages: languagesData as Record<string, number>,
        totalCommits: commits.length, // TODO: Get actual total count
        recentActivity,
        skillEvidence: {
          languages: Object.keys(languagesData),
          frameworks,
          tools,
        },
      }
    } catch (error) {
      console.error('GitHub analysis error:', error)
      throw new Error(`Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get authenticated GitHub user
   */
  async getUser(): Promise<{ id: number; login: string; name: string | null; email: string | null; avatar_url: string }> {
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

    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
    const scope = 'read:user,repo'

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`
  }

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`

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
      throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const githubService = new GitHubService()
