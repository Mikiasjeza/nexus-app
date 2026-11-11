/**
 * @jest-environment node
 */

import { Prisma } from '@prisma/client'
import { connectProvider, signInWithProvider } from '@/lib/auth/oauth/account'
import type { ProviderProfile } from '@/lib/auth/oauth/providers'

jest.mock('@/lib/db', () => ({
  prisma: {
    oAuthConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'hashed') },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    oAuthConnection: {
      findFirst: jest.Mock
      update: jest.Mock
      upsert: jest.Mock
      create: jest.Mock
    }
    user: { findUnique: jest.Mock; create: jest.Mock }
  }
}

const profile = (extra: Partial<ProviderProfile> = {}): ProviderProfile => ({
  providerId: 'google-sub-1',
  email: 'ada@example.com',
  emailVerified: true,
  emailAuthoritative: false,
  name: 'Ada Lovelace',
  ...extra,
})

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })

beforeEach(() => {
  jest.clearAllMocks()
  prisma.oAuthConnection.findFirst.mockResolvedValue(null)
  prisma.user.findUnique.mockResolvedValue(null)
  prisma.user.create.mockResolvedValue({ id: 'new-user' })
})

describe('signing in with a provider', () => {
  it('signs in the account linked to this provider id, without looking at email', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({
      id: 'c1',
      userId: 'linked-user',
      user: { onboardingComplete: true },
    })
    const outcome = await signInWithProvider('google', profile({ email: 'changed@example.com' }))
    expect(outcome).toEqual({
      kind: 'signed_in',
      userId: 'linked-user',
      isNew: false,
      onboardingComplete: true,
    })
    expect(prisma.oAuthConnection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { provider: 'google', providerId: 'google-sub-1' } })
    )
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('never links to an existing account that has the same email (takeover)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'victim', emailVerified: true })
    const outcome = await signInWithProvider('google', profile({ email: 'victim@example.com' }))
    expect(outcome).toEqual({ kind: 'refused', reason: 'account_exists' })
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
    expect(prisma.oAuthConnection.update).not.toHaveBeenCalled()
  })

  it('refuses to create an account from an address the provider has not verified', async () => {
    const outcome = await signInWithProvider('microsoft', profile({ emailVerified: false }))
    expect(outcome).toEqual({ kind: 'refused', reason: 'email_unverified' })
    // It must not even reveal whether that address has an account.
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('refuses when the provider gave no email', async () => {
    const outcome = await signInWithProvider('linkedin', profile({ email: null }))
    expect(outcome).toEqual({ kind: 'refused', reason: 'email_unverified' })
  })

  it('creates a confirmed account with the link and a free plan', async () => {
    const outcome = await signInWithProvider('google', profile())
    expect(outcome).toEqual({
      kind: 'signed_in',
      userId: 'new-user',
      isNew: true,
      onboardingComplete: false,
    })
    const data = prisma.user.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      passwordHash: 'hashed',
      emailVerified: true,
      onboardingComplete: false,
      oauthConnections: {
        create: {
          provider: 'google',
          providerId: 'google-sub-1',
          metadata: { email: 'ada@example.com' },
        },
      },
      subscriptions: { create: { plan: 'free', status: 'active' } },
    })
    // Nothing from the provider but its id and the address is kept.
    expect(JSON.stringify(data)).not.toMatch(/token/i)
    expect(data).not.toHaveProperty('avatar')
  })

  it('uses the start of the email when the provider gave no name', async () => {
    await signInWithProvider('google', profile({ name: null }))
    expect(prisma.user.create.mock.calls[0][0].data.name).toBe('ada')
  })

  it('treats losing a race for the same email as "account exists"', async () => {
    prisma.user.create.mockRejectedValue(uniqueViolation())
    const outcome = await signInWithProvider('google', profile())
    expect(outcome).toEqual({ kind: 'refused', reason: 'account_exists' })
  })

  describe('when Google runs the mailbox (Gmail or the address’s own Workspace)', () => {
    const gmail = () =>
      profile({ email: 'ada@gmail.com', emailAuthoritative: true, providerId: 'g-ada' })

    it('links and signs in an account whose address was already confirmed', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'old-github-user',
        emailVerified: true,
        onboardingComplete: true,
      })
      const outcome = await signInWithProvider('google', gmail())
      expect(outcome).toEqual({
        kind: 'signed_in',
        userId: 'old-github-user',
        isNew: false,
        onboardingComplete: true,
      })
      expect(prisma.oAuthConnection.create).toHaveBeenCalledWith({
        data: {
          userId: 'old-github-user',
          provider: 'google',
          providerId: 'g-ada',
          metadata: { email: 'ada@gmail.com' },
        },
      })
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('never links an account whose address nobody confirmed (it may be a squatter’s)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'squatter',
        emailVerified: false,
        onboardingComplete: true,
      })
      const outcome = await signInWithProvider('google', gmail())
      expect(outcome).toEqual({ kind: 'refused', reason: 'account_exists' })
      expect(prisma.oAuthConnection.create).not.toHaveBeenCalled()
    })

    it('never links on a verified address Google does not run', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', emailVerified: true })
      const outcome = await signInWithProvider(
        'google',
        profile({ email: 'ada@yahoo.com', emailAuthoritative: false })
      )
      expect(outcome).toEqual({ kind: 'refused', reason: 'account_exists' })
      expect(prisma.oAuthConnection.create).not.toHaveBeenCalled()
    })

    it('refuses when the account already has a different Google account linked', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', emailVerified: true })
      prisma.oAuthConnection.create.mockRejectedValue(uniqueViolation())
      const outcome = await signInWithProvider('google', gmail())
      expect(outcome).toEqual({ kind: 'refused', reason: 'account_exists' })
    })
  })

  it('lets other database errors through', async () => {
    prisma.user.create.mockRejectedValue(new Error('database is down'))
    await expect(signInWithProvider('google', profile())).rejects.toThrow('database is down')
  })
})

describe('connecting a provider in Settings', () => {
  it('links the provider to the signed-in account', async () => {
    const outcome = await connectProvider('user-1', 'linkedin', profile({ providerId: 'li-9' }))
    expect(outcome).toEqual({ kind: 'connected' })
    expect(prisma.oAuthConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_provider: { userId: 'user-1', provider: 'linkedin' } },
        create: expect.objectContaining({
          userId: 'user-1',
          provider: 'linkedin',
          providerId: 'li-9',
        }),
      })
    )
  })

  it('refuses a provider account that someone else already linked', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'someone-else' })
    const outcome = await connectProvider('user-1', 'google', profile())
    expect(outcome).toEqual({ kind: 'refused', reason: 'already_linked' })
    expect(prisma.oAuthConnection.upsert).not.toHaveBeenCalled()
  })

  it('allows linking again when it is already this person’s', async () => {
    prisma.oAuthConnection.findFirst.mockResolvedValue({ userId: 'user-1' })
    expect(await connectProvider('user-1', 'google', profile())).toEqual({ kind: 'connected' })
  })

  it('does not need a verified email: the id is what gets linked', async () => {
    const outcome = await connectProvider('user-1', 'microsoft', profile({ emailVerified: false }))
    expect(outcome).toEqual({ kind: 'connected' })
  })
})
