/**
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/reset-password/route'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findFirst: jest.fn(), update: jest.fn(() => 'update-user') },
    session: { deleteMany: jest.fn(() => 'delete-sessions') },
    oAuthConnection: { deleteMany: jest.fn(() => 'delete-links') },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/utils/rateLimit', () => ({ rateLimit: jest.fn(() => ({ allowed: true })) }))

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'new-hash') },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock }
    session: { deleteMany: jest.Mock }
    oAuthConnection: { deleteMany: jest.Mock }
    $transaction: jest.Mock
  }
}

const reset = (body: unknown) =>
  POST(
    new Request('https://app.test/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )

beforeEach(() => {
  jest.clearAllMocks()
  prisma.user.findFirst.mockResolvedValue({ id: 'user-1' })
  prisma.$transaction.mockResolvedValue([])
})

describe('password reset', () => {
  it('sets the password, confirms the address, and removes every older way in', async () => {
    const res = await reset({ token: 'reset-token', newPassword: 'a-long-password' })
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'new-hash',
        resetToken: null,
        resetExpires: null,
        emailVerified: true,
      },
    })
    // Other devices and every linked account (Google, Microsoft, LinkedIn, GitHub) go.
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(prisma.oAuthConnection.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    // All in one transaction, so a half-finished reset can't leave old access behind.
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'update-user',
      'delete-sessions',
      'delete-links',
    ])
  })

  it('changes nothing for an unknown or expired link', async () => {
    prisma.user.findFirst.mockResolvedValue(null)
    const res = await reset({ token: 'old-token', newPassword: 'a-long-password' })
    expect(res.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('refuses a short password', async () => {
    const res = await reset({ token: 'reset-token', newPassword: 'short' })
    expect(res.status).toBe(400)
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
  })
})
