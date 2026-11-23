/**
 * @jest-environment node
 */

import { createHash } from 'crypto'
import {
  consumeVerificationToken,
  issueVerificationToken,
  verifiedForEmployers,
} from '@/lib/auth/email-verification'
import { describeDevice } from '@/lib/auth/login-alert'
import { verifyTurnstile } from '@/lib/security/turnstile'

jest.mock('@/lib/db', () => ({
  prisma: { user: { update: jest.fn(), findFirst: jest.fn() } },
}))
jest.mock('@/lib/email/client', () => ({ emailService: { sendEmail: jest.fn() } }))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: { user: { update: jest.Mock; findFirst: jest.Mock } }
}
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

describe('email verification', () => {
  beforeEach(() => jest.clearAllMocks())

  it('stores only a hash of the token, with an expiry', async () => {
    const token = await issueVerificationToken('u1', 1_000)
    const stored = prisma.user.update.mock.calls[0][0].data.emailToken as string
    expect(stored).toBe(`${sha256(token)}.${1_000 + 24 * 60 * 60 * 1000}`)
    expect(stored).not.toContain(token)
  })

  it('verifies a current token once', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', emailToken: `${sha256('abc')}.5000` })
    await expect(consumeVerificationToken('abc', 4000)).resolves.toBe('verified')
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { emailToken: { startsWith: `${sha256('abc')}.` } } })
    )
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: true, emailToken: null },
    })
  })

  it('refuses expired and unknown tokens', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', emailToken: `${sha256('abc')}.5000` })
    await expect(consumeVerificationToken('abc', 6000)).resolves.toBe('expired')
    prisma.user.findFirst.mockResolvedValue(null)
    await expect(consumeVerificationToken('nope')).resolves.toBe('invalid')
    await expect(consumeVerificationToken('')).resolves.toBe('invalid')
  })

  it('only requires verified emails for employers once email can be sent', () => {
    const saved = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    expect(verifiedForEmployers()).toEqual({})
    process.env.RESEND_API_KEY = 're_test'
    expect(verifiedForEmployers()).toEqual({ emailVerified: true })
    if (saved === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = saved
  })
})

describe('login alerts', () => {
  it('describes the browser and system', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
      )
    ).toBe('Chrome on Windows')
    expect(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe('Safari on iOS')
    expect(describeDevice(null)).toBe('a browser on an unknown device')
  })
})

describe('Turnstile', () => {
  const request = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
    jest.restoreAllMocks()
  })

  it('lets requests through while it is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    await expect(verifyTurnstile(undefined, request)).resolves.toBe(true)
  })

  it('checks the answer with Cloudflare once configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site'
    await expect(verifyTurnstile('', request)).resolves.toBe(false)

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ success: true })))
    await expect(verifyTurnstile('token', request)).resolves.toBe(true)
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams
    expect(body.get('response')).toBe('token')
    expect(body.get('remoteip')).toBe('1.2.3.4')

    fetchMock.mockRejectedValue(new Error('offline'))
    await expect(verifyTurnstile('token', request)).resolves.toBe(false)
  })
})
