/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/github/callback/route'

jest.mock('@/lib/db', () => ({
  prisma: {
    oAuthConnection: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/integrations/github', () => ({
  githubService: { exchangeCodeForToken: jest.fn() },
  githubClientFor: jest.fn(),
}))

jest.mock('@/lib/auth/oauth-state', () => ({
  verifyState: jest.fn(),
}))

jest.mock('@/lib/auth/session', () => ({
  createSession: jest.fn(),
  setSessionCookie: jest.fn(),
  getSessionUserId: jest.fn(),
  clearGuestPreviewCookie: jest.fn(),
}))

jest.mock('@/lib/config/env', () => ({
  getAppUrl: () => 'https://app.test',
}))

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'hashed') },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    oAuthConnection: { findFirst: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock }
    user: { findUnique: jest.Mock; create: jest.Mock }
  }
}
const github = jest.requireMock('@/lib/integrations/github') as {
  githubService: { exchangeCodeForToken: jest.Mock }
  githubClientFor: jest.Mock
}
const { verifyState } = jest.requireMock('@/lib/auth/oauth-state') as { verifyState: jest.Mock }
const session = jest.requireMock('@/lib/auth/session') as {
  createSession: jest.Mock
  setSessionCookie: jest.Mock
  getSessionUserId: jest.Mock
  clearGuestPreviewCookie: jest.Mock
}

const GITHUB_USER = {
  id: 4242,
  login: 'octo',
  name: 'Octo Cat',
  // Attacker-controlled, unverified profile email pointing at a victim.
  email: 'victim@example.com',
  avatar_url: 'https://avatars.example/octo.png',
}

let client: { getUser: jest.Mock; getVerifiedPrimaryEmail: jest.Mock }

function callback(query = 'code=abc&state=xyz') {
  return GET(new NextRequest(`https://app.test/api/auth/github/callback?${query}`))
}

function location(res: Response) {
  return new URL(res.headers.get('location') ?? '')
}

beforeEach(() => {
  jest.clearAllMocks()
  verifyState.mockResolvedValue(true)
  github.githubService.exchangeCodeForToken.mockResolvedValue('gh-token')
  client = {
    getUser: jest.fn().mockResolvedValue(GITHUB_USER),
    getVerifiedPrimaryEmail: jest.fn().mockResolvedValue('octo@example.com'),
  }
  github.githubClientFor.mockReturnValue(client)
  session.getSessionUserId.mockResolvedValue(null)
  session.createSession.mockResolvedValue('session-token')
  prisma.oAuthConnection.findFirst.mockResolvedValue(null)
  prisma.user.findUnique.mockResolvedValue(null)
  prisma.user.create.mockResolvedValue({ id: 'new-user' })
})

describe('GitHub OAuth callback', () => {
  it('rejects an invalid state without exchanging the code', async () => {
    verifyState.mockResolvedValue(false)
    const res = await callback()
    expect(location(res).searchParams.get('error')).toBe('invalid_state')
    expect(github.githubService.exchangeCodeForToken).not.toHaveBeenCalled()
  })

  it('uses a per-request GitHub client for the exchanged token', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'u1' })
    await callback()
    expect(github.githubClientFor).toHaveBeenCalledWith('gh-token')
  })

  it('signs in the account already linked to this GitHub ID', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'linked-user' })
    const res = await callback()
    expect(session.createSession).toHaveBeenCalledWith('linked-user')
    expect(location(res).pathname).toBe('/dashboard')
    // Matching is by GitHub ID only: email is never consulted.
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(client.getVerifiedPrimaryEmail).not.toHaveBeenCalled()
  })

  it('refuses to link to an existing account that has the same email (takeover)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'victim' })
    const res = await callback()
    expect(location(res).searchParams.get('error')).toBe('github_account_exists')
    expect(session.createSession).not.toHaveBeenCalled()
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('ignores the unverified profile email and uses only the verified primary email', async () => {
    await callback()
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'octo@example.com' } })
    )
    expect(prisma.user.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'victim@example.com' } })
    )
  })

  it('refuses sign-up when GitHub has no verified primary email', async () => {
    client.getVerifiedPrimaryEmail.mockResolvedValue(null)
    const res = await callback()
    expect(location(res).searchParams.get('error')).toBe('github_email_unverified')
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(session.createSession).not.toHaveBeenCalled()
  })

  it('creates a new account from the verified email', async () => {
    const res = await callback()
    const data = prisma.user.create.mock.calls[0][0].data
    expect(data.email).toBe('octo@example.com')
    expect(data.emailVerified).toBe(true)
    expect(data.oauthConnections.create).toEqual(
      expect.objectContaining({ provider: 'github', providerId: '4242' })
    )
    expect(data.oauthConnections.create).not.toHaveProperty('accessToken')
    expect(session.createSession).toHaveBeenCalledWith('new-user')
    expect(location(res).pathname).toBe('/dashboard')
  })

  it('links GitHub to the signed-in user (explicit Connect GitHub)', async () => {
    session.getSessionUserId.mockResolvedValue('current-user')
    const res = await callback()
    expect(prisma.oAuthConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_provider: { userId: 'current-user', provider: 'github' } },
      })
    )
    expect(session.createSession).not.toHaveBeenCalled()
    expect(location(res).pathname).toBe('/settings')
    expect(location(res).searchParams.get('github')).toBe('connected')
  })

  it('refuses to link a GitHub account already linked to someone else', async () => {
    session.getSessionUserId.mockResolvedValue('current-user')
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'other-user' })
    const res = await callback()
    expect(location(res).searchParams.get('github')).toBe('already_linked')
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
  })

  it('maps a cancelled GitHub consent screen to a friendly error', async () => {
    const res = await callback('error=access_denied')
    expect(location(res).searchParams.get('error')).toBe('github_cancelled')
  })
})
