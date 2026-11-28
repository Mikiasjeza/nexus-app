/**
 * @jest-environment node
 */

import { POST as registerPost } from '@/app/api/auth/register/route'
import { GET as adminWaitlistGet } from '@/app/api/admin/waitlist/route'
import { hasPrelaunchAccess } from '@/lib/auth/session'
import { AssessmentError } from '@/lib/assessments/errors'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    subscription: { count: jest.fn() },
  },
}))
jest.mock('@/lib/utils/rateLimit', () => ({ rateLimit: jest.fn(() => ({ allowed: true })) }))
jest.mock('@/lib/security/turnstile', () => ({
  TURNSTILE_FIELD: 'turnstileToken',
  TURNSTILE_FAILED: 'failed',
  verifyTurnstile: jest.fn(async () => true),
}))
jest.mock('@/lib/assessments/http', () => {
  const actual = jest.requireActual('@/lib/assessments/http')
  return { ...actual, requireReviewer: jest.fn() }
})
jest.mock('@/lib/waitlist', () => ({ waitlistStats: jest.fn(async () => ({ confirmed: 3 })) }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock }
    subscription: { count: jest.Mock }
  }
}
const http = jest.requireMock('@/lib/assessments/http') as { requireReviewer: jest.Mock }

const ENV = { ...process.env }
beforeEach(() => {
  jest.clearAllMocks()
  process.env.PRELAUNCH_MODE = 'true'
  process.env.ADMIN_EMAILS = 'owner@nexus.test'
  delete process.env.PRELAUNCH_ALLOWLIST
})
afterEach(() => {
  process.env = { ...ENV }
})

const register = (email: string) =>
  registerPost(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'a-long-password',
        name: 'Test',
        ageConfirmed: true,
      }),
    })
  )

describe('sign-up while pre-launch mode is on', () => {
  it('refuses new accounts and points to the waitlist', async () => {
    const res = await register('stranger@nexus.test')
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/waitlist/i)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('still lets an admin create their account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' }) // stop before creating anything
    const res = await register('owner@nexus.test')
    expect(res.status).not.toBe(403)
  })
})

describe('signed-in access while pre-launch mode is on', () => {
  const user = (over: Record<string, unknown> = {}) => ({
    email: 'someone@nexus.test',
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
    subscriptions: [{ plan: 'free', status: 'active' }],
    companyMembers: [],
    ...over,
  })

  it('lets a confirmed admin in', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ email: 'owner@nexus.test' }))
    expect(await hasPrelaunchAccess('u1')).toBe(true)
  })

  it('keeps a paying customer in', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ subscriptions: [{ plan: 'pro', status: 'active' }] })
    )
    expect(await hasPrelaunchAccess('u1')).toBe(true)
  })

  it('keeps members of a paying company in', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        companyMembers: [{ company: { subscriptions: [{ plan: 'team', status: 'past_due' }] } }],
      })
    )
    expect(await hasPrelaunchAccess('u1')).toBe(true)
  })

  it('does not count a cancelled paid plan', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ subscriptions: [{ plan: 'pro', status: 'canceled' }] })
    )
    expect(await hasPrelaunchAccess('u1')).toBe(false)
  })

  it('keeps free accounts out until launch', async () => {
    prisma.user.findUnique.mockResolvedValue(user())
    expect(await hasPrelaunchAccess('u1')).toBe(false)
  })
})

describe('admin waitlist numbers', () => {
  it('are only for admins', async () => {
    http.requireReviewer.mockRejectedValue(new AssessmentError('Not found', 404))
    const res = await adminWaitlistGet()
    expect(res.status).toBe(404)
    expect(prisma.subscription.count).not.toHaveBeenCalled()
  })

  it('show admins the list and how many paying customers keep access', async () => {
    http.requireReviewer.mockResolvedValue('admin')
    prisma.subscription.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)
    const res = await adminWaitlistGet()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      confirmed: 3,
      prelaunch: true,
      payingCustomers: { people: 2, companies: 1 },
    })
  })
})
