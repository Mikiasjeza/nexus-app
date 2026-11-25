/**
 * @jest-environment node
 */

import {
  alertWhere,
  hashToken,
  isDue,
  sendDueAlerts,
  unsubscribe,
  createAlert,
} from '@/lib/jobs/alerts'
import { deleteTracked, trackCreateSchema, trackJob } from '@/lib/jobs/tracker'

jest.mock('@/lib/db', () => ({
  prisma: {
    jobAlert: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (a: { data: unknown }) => a.data),
      findMany: jest.fn(),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    alertDelivery: {
      findMany: jest.fn(async () => [{ externalJobId: 'old' }]),
      createMany: jest.fn(async () => ({ count: 1 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    externalJob: { findMany: jest.fn() },
    trackedJob: {
      count: jest.fn(async () => 0),
      upsert: jest.fn(async (a: unknown) => a),
      create: jest.fn(async (a: unknown) => a),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}))
jest.mock('@/lib/email/client', () => ({
  emailService: { sendEmail: jest.fn(async () => undefined) },
}))
jest.mock('@/lib/auth/email-verification', () => ({ emailDeliveryConfigured: () => true }))
jest.mock('@/lib/config/env', () => ({ getAppUrl: () => 'https://nexusverified.com' }))
jest.mock('@/lib/notifications', () => ({ notify: jest.fn(async () => undefined) }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: Record<string, Record<string, jest.Mock>>
}
const { emailService } = jest.requireMock('@/lib/email/client') as {
  emailService: { sendEmail: jest.Mock }
}

describe('job alerts', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends daily alerts each day and weekly ones each week', () => {
    const now = new Date('2026-12-10T07:00:00Z')
    const ago = (days: number) => new Date(now.getTime() - days * 86_400_000)
    expect(isDue({ frequency: 'daily', lastSentAt: ago(1) }, now)).toBe(true)
    expect(isDue({ frequency: 'weekly', lastSentAt: ago(3) }, now)).toBe(false)
    expect(isDue({ frequency: 'weekly', lastSentAt: ago(7) }, now)).toBe(true)
    expect(isDue({ frequency: 'weekly', lastSentAt: null }, now)).toBe(true)
  })

  it('filters by role, location (or remote), type and salary', () => {
    const where = alertWhere(
      {
        roles: ['Analyst'],
        locations: ['Austin, TX'],
        salaryMin: 60000,
        jobTypes: ['full-time'],
        remoteOnly: false,
      },
      new Date(0)
    )
    const json = JSON.stringify(where)
    expect(json).toContain('Analyst')
    expect(json).toContain('Austin')
    expect(json).toContain('"remote":true')
    expect(json).toContain('full-time')
    expect(json).toContain('60000')
  })

  it('needs a role or a location', async () => {
    await expect(createAlert('me', { roles: [], locations: [] })).rejects.toMatchObject({
      status: 400,
    })
  })

  it('emails only new jobs, records them, and includes an unsubscribe link', async () => {
    prisma.jobAlert.findMany.mockResolvedValue([
      {
        id: 'a1',
        userId: 'me',
        roles: ['Analyst'],
        locations: [],
        salaryMin: null,
        jobTypes: [],
        remoteOnly: false,
        frequency: 'daily',
        enabled: true,
        lastSentAt: null,
        user: { email: 'me@example.com', name: 'Jane Doe' },
      },
    ])
    prisma.externalJob.findMany.mockResolvedValue([
      {
        id: 'j1',
        title: 'Data Analyst',
        company: 'Acme',
        location: 'Austin',
        applyUrl: 'https://acme.example/j1',
        remote: false,
      },
    ])
    expect(await sendDueAlerts()).toEqual({ sent: 1, skipped: 0 })

    // Already-sent jobs are excluded from the query.
    expect(prisma.externalJob.findMany.mock.calls[0][0].where.id).toEqual({ notIn: ['old'] })
    const email = emailService.sendEmail.mock.calls[0][0]
    expect(email.html).toContain('/api/jobs/alerts/unsubscribe?token=')
    expect(email.text).toContain('Unsubscribe')
    expect(prisma.alertDelivery.createMany.mock.calls[0][0].data).toEqual([
      { alertId: 'a1', externalJobId: 'j1' },
    ])
  })

  it('unsubscribes by the hashed token and rejects junk', async () => {
    expect(await unsubscribe('bad token!')).toBe(false)
    await unsubscribe('a'.repeat(32))
    expect(prisma.jobAlert.updateMany.mock.calls[0][0]).toEqual({
      where: { unsubscribeToken: hashToken('a'.repeat(32)) },
      data: { enabled: false },
    })
  })
})

describe('saved jobs and tracker', () => {
  beforeEach(() => jest.clearAllMocks())

  it('accepts only web links and known statuses', () => {
    expect(() =>
      trackCreateSchema.parse({ title: 'A', company: 'B', url: 'javascript:alert(1)' })
    ).toThrow()
    expect(() => trackCreateSchema.parse({ title: 'A', company: 'B', status: 'hired!' })).toThrow()
    expect(trackCreateSchema.parse({ title: 'A', company: 'B', url: '' }).url).toBeNull()
  })

  it('saves a listing once per person and stamps applications', async () => {
    await trackJob('me', {
      jobRef: 'ext:abcdefghij12',
      title: 'Analyst',
      company: 'Acme',
      status: 'applied',
    })
    const call = prisma.trackedJob.upsert.mock.calls[0][0]
    expect(call.where).toEqual({ userId_jobRef: { userId: 'me', jobRef: 'ext:abcdefghij12' } })
    expect(call.create.appliedAt).toBeInstanceOf(Date)
  })

  it("can't delete someone else's entry", async () => {
    await expect(deleteTracked('me', 'theirs')).rejects.toMatchObject({ status: 404 })
  })
})
