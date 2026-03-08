/**
 * @jest-environment node
 */

import { POST as forgotPasswordPost } from '@/app/api/auth/forgot-password/route'
import { POST as resetPasswordPost } from '@/app/api/auth/reset-password/route'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('@/lib/email/client', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn(),
  },
}))

jest.mock('@/lib/utils/rateLimit', () => ({
  rateLimit: jest.fn(() => ({ allowed: true })),
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    user: {
      findUnique: jest.Mock
      update: jest.Mock
      findFirst: jest.Mock
    }
  }
}

const { emailService } = jest.requireMock('@/lib/email/client') as {
  emailService: {
    sendPasswordResetEmail: jest.Mock
  }
}

describe('password reset routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forgot-password returns ok even if email does not exist', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com' }),
    })
    const res = await forgotPasswordPost(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('forgot-password stores token and triggers email when user exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'test@example.com',
    })
    prisma.user.update.mockResolvedValueOnce({})

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const res = await forgotPasswordPost(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    const callArg = prisma.user.update.mock.calls[0]?.[0]
    expect(typeof callArg.data.resetToken).toBe('string')
    expect(callArg.data.resetToken.length).toBeGreaterThan(20)
    expect(callArg.data.resetExpires).toBeInstanceOf(Date)
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1)
  })

  it('reset-password rejects invalid token', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'bad-token', newPassword: 'newPassword123' }),
    })
    const res = await resetPasswordPost(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Invalid or expired reset token/i)
  })

  it('reset-password updates hash and clears reset fields', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'user_2',
      resetToken: 'valid-token',
    })
    prisma.user.update.mockResolvedValueOnce({})

    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', newPassword: 'newPassword123' }),
    })
    const res = await resetPasswordPost(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    const updateArg = prisma.user.update.mock.calls[0]?.[0]
    expect(updateArg.data.resetToken).toBeNull()
    expect(updateArg.data.resetExpires).toBeNull()
    expect(typeof updateArg.data.passwordHash).toBe('string')
    expect(updateArg.data.passwordHash).not.toBe('newPassword123')
    expect(await bcrypt.compare('newPassword123', updateArg.data.passwordHash)).toBe(true)
  })
})
