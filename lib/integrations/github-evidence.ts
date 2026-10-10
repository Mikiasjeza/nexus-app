/**
 * Turn a GitHub repository link into evidence the AI can actually assess:
 * languages, dependencies, README and, crucially, whether the submitter
 * contributed to it. Without that last check anyone could link a famous
 * repository and claim its authors' skills.
 *
 * Reads public data only. Set GITHUB_TOKEN (a token with no scopes is enough)
 * to raise GitHub's rate limit from 60 to 5,000 requests an hour.
 */

import { Octokit } from 'octokit'

const REQUEST_TIMEOUT_MS = 8000
const README_CHARS = 4000
const MANIFEST_CHARS = 2500
const MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml']

export type Authorship =
  | { kind: 'owner' }
  | { kind: 'contributor'; contributions: number }
  | { kind: 'not_contributor' }
  | { kind: 'unconfirmed' }

export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)
    if (!['github.com', 'www.github.com'].includes(parsed.hostname)) return null
    const [owner, rawRepo] = parsed.pathname.split('/').filter(Boolean)
    const repo = rawRepo?.replace(/\.git$/, '')
    const segment = /^[A-Za-z0-9_.-]+$/
    if (!owner || !repo || !segment.test(owner) || !segment.test(repo)) return null
    return { owner, repo }
  } catch {
    return null
  }
}

export function describeAuthorship(authorship: Authorship): string {
  switch (authorship.kind) {
    case 'owner':
      return 'Authorship: confirmed. The submitter owns this repository.'
    case 'contributor':
      return `Authorship: confirmed. The submitter made ${authorship.contributions} commits to this repository.`
    case 'not_contributor':
      return 'Authorship: NOT the submitter. Their linked GitHub account is not among the contributors, so this is not evidence of their own work.'
    case 'unconfirmed':
      return 'Authorship: unconfirmed. The submitter has not linked a GitHub account, so there is no proof this is their work.'
  }
}

function client(): Octokit {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    request: { timeout: REQUEST_TIMEOUT_MS },
  })
}

async function fileText(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path })
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null
    return Buffer.from(data.content, 'base64').toString('utf8')
  } catch {
    return null
  }
}

async function findAuthorship(
  octokit: Octokit,
  owner: string,
  repo: string,
  ownerId: number,
  submitterGithubId: string | null
): Promise<Authorship> {
  if (!submitterGithubId) return { kind: 'unconfirmed' }
  if (String(ownerId) === submitterGithubId) return { kind: 'owner' }
  try {
    const contributors = await octokit.paginate(octokit.rest.repos.listContributors, {
      owner,
      repo,
      per_page: 100,
    })
    const match = contributors.find((c) => String(c.id) === submitterGithubId)
    return match
      ? { kind: 'contributor', contributions: match.contributions }
      : { kind: 'not_contributor' }
  } catch {
    // Very large repositories can't list contributors; don't assume either way.
    return { kind: 'unconfirmed' }
  }
}

export type RepositoryEvidence = {
  /** Platform-checked authorship. Never contains user-written text. */
  authorship: string
  /** Repository contents. README and manifests are written by the repo owner: untrusted. */
  details: string
}

/**
 * What the repository contains and whether the submitter wrote it, or null
 * if the URL isn't a GitHub repository. Never throws: an unreachable
 * repository is described as such.
 */
export async function describeGitHubRepository(
  url: string,
  submitterGithubId: string | null
): Promise<RepositoryEvidence | null> {
  const ref = parseGitHubRepoUrl(url)
  if (!ref) return null
  const { owner, repo } = ref
  const octokit = client()

  let repoData
  try {
    repoData = (await octokit.rest.repos.get({ owner, repo })).data
  } catch {
    return {
      authorship: 'Authorship: unknown. The repository was not found or is private.',
      details: `GitHub repository ${owner}/${repo} could not be read.`,
    }
  }

  const [languages, readme, authorship, ...manifests] = await Promise.all([
    octokit.rest.repos
      .listLanguages({ owner, repo })
      .then(({ data }) => data)
      .catch(() => ({}) as Record<string, number>),
    octokit.rest.repos
      .getReadme({ owner, repo, mediaType: { format: 'raw' } })
      .then(({ data }) => String(data))
      .catch(() => null),
    findAuthorship(octokit, owner, repo, repoData.owner.id, submitterGithubId),
    ...MANIFESTS.map((path) => fileText(octokit, owner, repo, path)),
  ])

  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
  const languageSummary = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, bytes]) => `${name} ${Math.round((bytes / totalBytes) * 100)}%`)
    .join(', ')

  const sections = [
    `GitHub repository ${repoData.full_name}`,
    repoData.fork ? 'This repository is a fork of another project.' : '',
    repoData.description ? `Description: ${repoData.description}` : '',
    languageSummary ? `Languages: ${languageSummary}` : '',
    `Stars: ${repoData.stargazers_count}. Created ${repoData.created_at.slice(0, 10)}, last pushed ${repoData.pushed_at?.slice(0, 10) ?? 'unknown'}.`,
    ...MANIFESTS.map((path, i) =>
      manifests[i] ? `${path}:\n${manifests[i]!.slice(0, MANIFEST_CHARS)}` : ''
    ),
    readme ? `README (start):\n${readme.slice(0, README_CHARS)}` : '',
  ]
  return {
    authorship: describeAuthorship(authorship),
    details: sections.filter(Boolean).join('\n\n'),
  }
}
