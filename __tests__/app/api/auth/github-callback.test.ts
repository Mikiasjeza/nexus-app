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
}))

jest.mock('@/lib/config/env', () => ({
  getAppUrl: () => 'https://app.test',
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    oAuthConnection: { findFirst: jest.Mock; upsert: jest.Mock }
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
}

const GITHUB_USER = {
  id: 4242,
  login: 'octo',
  name: 'Octo Cat',
  email: 'victim@example.com',
  avatar_url: 'https://avatars.example/octo.png',
}

let client: { getUser: jest.Mock }

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
  client = { getUser: jest.fn().mockResolvedValue(GITHUB_USER) }
  github.githubClientFor.mockReturnValue(client)
  session.getSessionUserId.mockResolvedValue('current-user')
  prisma.oAuthConnection.findFirst.mockResolvedValue(null)
})

describe('GitHub callback (Connect GitHub only)', () => {
  it('links GitHub to the signed-in account by GitHub’s user id', async () => {
    const res = await callback()
    expect(github.githubClientFor).toHaveBeenCalledWith('gh-token')
    expect(prisma.oAuthConnection.upsert).toHaveBeenCalledWith({
      where: { userId_provider: { userId: 'current-user', provider: 'github' } },
      create: {
        userId: 'current-user',
        provider: 'github',
        providerId: '4242',
        metadata: { login: 'octo' },
      },
      update: { providerId: '4242', metadata: { login: 'octo' } },
    })
    expect(location(res).pathname).toBe('/settings')
    expect(location(res).searchParams.get('github')).toBe('connected')
  })

  it('is not a way to sign in: without a session nothing happens', async () => {
    session.getSessionUserId.mockResolvedValue(null)
    const res = await callback()
    expect(location(res).pathname).toBe('/auth/login')
    expect(location(res).searchParams.get('error')).toBe('github_signin_removed')
    expect(github.githubService.exchangeCodeForToken).not.toHaveBeenCalled()
    expect(session.createSession).not.toHaveBeenCalled()
    expect(session.setSessionCookie).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('never signs in the account a GitHub id is already linked to', async () => {
    session.getSessionUserId.mockResolvedValue(null)
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'linked-user' })
    await callback()
    expect(session.createSession).not.toHaveBeenCalled()
  })

  it('rejects an invalid state without exchanging the code', async () => {
    verifyState.mockResolvedValue(false)
    const res = await callback()
    expect(location(res).searchParams.get('github')).toBe('failed')
    expect(github.githubService.exchangeCodeForToken).not.toHaveBeenCalled()
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
  })

  it('always clears the state cookie, even without a session', async () => {
    session.getSessionUserId.mockResolvedValue(null)
    await callback()
    expect(verifyState).toHaveBeenCalledWith('xyz')
  })

  it('refuses a GitHub account already linked to someone else', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'other-user' })
    const res = await callback()
    expect(location(res).searchParams.get('github')).toBe('already_linked')
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
  })

  it('maps a cancelled GitHub consent screen to a friendly result', async () => {
    const res = await callback('error=access_denied&state=xyz')
    expect(location(res).pathname).toBe('/settings')
    expect(location(res).searchParams.get('github')).toBe('cancelled')
    expect(github.githubService.exchangeCodeForToken).not.toHaveBeenCalled()
  })

  it('reports a failed exchange without linking anything', async () => {
    github.githubService.exchangeCodeForToken.mockRejectedValue(new Error('bad code'))
    const res = await callback()
    expect(location(res).searchParams.get('github')).toBe('failed')
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
  })
})
