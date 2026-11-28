/**
 * @jest-environment node
 */

import {
  CONSENT_TEXT,
  confirmSignup,
  exportConfirmedCsv,
  hashToken,
  joinSchema,
  joinWaitlist,
  unsubscribeSignup,
} from '@/lib/waitlist'

jest.mock('@/lib/db', () => ({
  prisma: {
    launchWaitlist: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    launchStat: { upsert: jest.fn(async () => ({})) },
  },
}))
jest.mock('@/lib/email/client', () => ({ emailService: { sendEmail: jest.fn() } }))
jest.mock('@/lib/auth/email-verification', () => ({ emailDeliveryConfigured: () => true }))
jest.mock('@/lib/config/env', () => ({ getAppUrl: () => 'https://nexus.example' }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    launchWaitlist: Record<
      'findUnique' | 'upsert' | 'update' | 'updateMany' | 'findMany',
      jest.Mock
    >
    launchStat: { upsert: jest.Mock }
  }
}
const { emailService } = jest.requireMock('@/lib/email/client') as {
  emailService: { sendEmail: jest.Mock }
}

const input = (over = {}) =>
  joinSchema.parse({ email: ' New@Example.com ', consent: true, source: 'linkedin', ...over })

beforeEach(() => jest.clearAllMocks())

describe('joinSchema', () => {
  it('normalises the email and requires consent', () => {
    expect(input().email).toBe('new@example.com')
    expect(joinSchema.safeParse({ email: 'a@b.co', consent: false }).success).toBe(false)
    expect(joinSchema.safeParse({ email: 'not-an-email', consent: true }).success).toBe(false)
  })

  it('accepts a filled honeypot, so bots get the normal answer and learn nothing', () => {
    expect(joinSchema.safeParse({ email: 'a@b.co', consent: true, website: 'x' }).success).toBe(
      true
    )
  })

  it('rejects odd source labels', () => {
    expect(
      joinSchema.safeParse({ email: 'a@b.co', consent: true, source: '<script>' }).success
    ).toBe(false)
  })
})

describe('joinWaitlist', () => {
  it('stores a new signup as pending, with consent, and emails a confirmation link', async () => {
    prisma.launchWaitlist.findUnique.mockResolvedValue(null)
    expect(await joinWaitlist(input())).toBe('ok')
    const args = prisma.launchWaitlist.upsert.mock.calls[0][0]
    expect(args.create).toMatchObject({
      email: 'new@example.com',
      consentText: CONSENT_TEXT,
      source: 'linkedin',
    })
    expect(args.create.confirmTokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(prisma.launchStat.upsert).toHaveBeenCalledTimes(1) // one new signup counted
    const mail = emailService.sendEmail.mock.calls[0][0]
    expect(mail.to).toBe('new@example.com')
    expect(mail.text).toContain('https://nexus.example/api/waitlist/confirm?token=')
    expect(mail.text).toContain('https://nexus.example/api/waitlist/unsubscribe?token=')
  })

  it('never makes a second row or count for a repeat signup', async () => {
    prisma.launchWaitlist.findUnique.mockResolvedValue({ status: 'pending' })
    expect(await joinWaitlist(input())).toBe('ok')
    expect(prisma.launchWaitlist.upsert).toHaveBeenCalledTimes(1) // upsert, keyed on email
    expect(prisma.launchStat.upsert).not.toHaveBeenCalled()
  })

  it('does nothing for someone already confirmed, but answers the same', async () => {
    prisma.launchWaitlist.findUnique.mockResolvedValue({ status: 'confirmed' })
    expect(await joinWaitlist(input())).toBe('ok')
    expect(prisma.launchWaitlist.upsert).not.toHaveBeenCalled()
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  it('silently drops bots that fill the hidden field', async () => {
    const bot = { ...input(), website: 'spam.example' }
    expect(await joinWaitlist(bot)).toBe('spam')
    expect(prisma.launchWaitlist.findUnique).not.toHaveBeenCalled()
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })
})

describe('confirm and unsubscribe links', () => {
  const token = 'a'.repeat(32)

  it('confirms a pending signup once', async () => {
    prisma.launchWaitlist.findUnique.mockResolvedValue({ id: 'w1', status: 'pending' })
    expect(await confirmSignup(token)).toBe(true)
    expect(prisma.launchWaitlist.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { confirmTokenHash: hashToken(token) } })
    )
    expect(prisma.launchWaitlist.update.mock.calls[0][0].data).toMatchObject({
      status: 'confirmed',
      confirmTokenHash: null,
    })
  })

  it('will not re-subscribe someone who unsubscribed', async () => {
    prisma.launchWaitlist.findUnique.mockResolvedValue({ id: 'w1', status: 'unsubscribed' })
    expect(await confirmSignup(token)).toBe(false)
    expect(prisma.launchWaitlist.update).not.toHaveBeenCalled()
  })

  it('rejects malformed tokens without touching the database', async () => {
    expect(await confirmSignup('../../etc')).toBe(false)
    expect(await unsubscribeSignup('')).toBe(false)
    expect(prisma.launchWaitlist.findUnique).not.toHaveBeenCalled()
    expect(prisma.launchWaitlist.updateMany).not.toHaveBeenCalled()
  })

  it('unsubscribes by token', async () => {
    prisma.launchWaitlist.updateMany.mockResolvedValue({ count: 1 })
    expect(await unsubscribeSignup(token)).toBe(true)
    expect(prisma.launchWaitlist.updateMany.mock.calls[0][0]).toMatchObject({
      where: { unsubscribeTokenHash: hashToken(token) },
      data: { status: 'unsubscribed' },
    })
  })
})

describe('exportConfirmedCsv', () => {
  it('exports confirmed signups and neutralises spreadsheet formulas', async () => {
    prisma.launchWaitlist.findMany.mockResolvedValue([
      {
        email: 'a@example.com',
        confirmedAt: new Date('2026-12-01T00:00:00Z'),
        consentAt: new Date('2026-11-30T00:00:00Z'),
        source: '=HYPERLINK("x")',
      },
    ])
    const csv = await exportConfirmedCsv()
    const [header, row] = csv.split('\n')
    expect(header).toBe('email,confirmed_at,consent_at,source')
    expect(row).toContain('a@example.com,2026-12-01T00:00:00.000Z')
    expect(row).toContain(`"'=HYPERLINK(""x"")"`)
    expect(prisma.launchWaitlist.findMany.mock.calls[0][0].where).toEqual({ status: 'confirmed' })
  })
})
