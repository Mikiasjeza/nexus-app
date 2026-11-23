/**
 * @jest-environment node
 */

import {
  base32Decode,
  base32Encode,
  codeAt,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  matchStep,
  otpauthUrl,
} from '@/lib/auth/totp'
import { decodeChallenge, encodeChallenge, verifySecondFactor } from '@/lib/auth/two-factor'

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@/lib/db', () => ({ prisma: { user: { findUnique: jest.fn(), update: jest.fn() } } }))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: { user: { findUnique: jest.Mock; update: jest.Mock } }
}

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-two-factor'
})

// RFC 6238 appendix B: SHA-1 secret "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

describe('TOTP', () => {
  it('matches the RFC 6238 test vectors', () => {
    expect(codeAt(RFC_SECRET, Math.floor(59 / 30), 8)).toBe('94287082')
    expect(codeAt(RFC_SECRET, Math.floor(1111111109 / 30), 8)).toBe('07081804')
    expect(codeAt(RFC_SECRET, Math.floor(20000000000 / 30), 8)).toBe('65353130')
  })

  it('round-trips base32', () => {
    const bytes = Buffer.from('hello two-step login')
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true)
    expect(generateSecret()).toMatch(/^[A-Z2-7]{32}$/)
  })

  it('accepts the current code and one step either side, nothing else', () => {
    const now = 1_700_000_000_000
    const step = Math.floor(now / 30_000)
    expect(matchStep(RFC_SECRET, codeAt(RFC_SECRET, step), now)).toBe(step)
    expect(matchStep(RFC_SECRET, codeAt(RFC_SECRET, step - 1), now)).toBe(step - 1)
    expect(matchStep(RFC_SECRET, codeAt(RFC_SECRET, step + 2), now)).toBeNull()
    expect(matchStep(RFC_SECRET, 'abcdef', now)).toBeNull()
  })

  it('builds an otpauth address apps can scan', () => {
    const url = new URL(otpauthUrl('ABCDEF', 'a@b.co'))
    expect(url.protocol).toBe('otpauth:')
    expect(url.searchParams.get('secret')).toBe('ABCDEF')
    expect(url.searchParams.get('issuer')).toBe('Nexus')
  })

  it('encrypts secrets so the stored value differs and decrypts back', () => {
    const stored = encryptSecret(RFC_SECRET)
    expect(stored).not.toContain(RFC_SECRET)
    expect(decryptSecret(stored)).toBe(RFC_SECRET)
    const tampered = stored.slice(0, -2) + (stored.endsWith('A') ? 'BB' : 'AA')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('makes ten distinct recovery codes, hashed case- and dash-insensitively', () => {
    const codes = generateRecoveryCodes()
    expect(new Set(codes).size).toBe(10)
    expect(codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
    expect(hashRecoveryCode(codes[0].toUpperCase().replace(/-/g, ' '))).toBe(
      hashRecoveryCode(codes[0])
    )
  })
})

describe('sign-in challenge', () => {
  it('accepts its own signed, unexpired challenge', () => {
    const value = encodeChallenge({ uid: 'u1', exp: 2000, next: '/skills' })
    expect(decodeChallenge(value, 1000)).toEqual({ uid: 'u1', exp: 2000, next: '/skills' })
  })

  it('rejects expired, tampered and forged challenges', () => {
    const value = encodeChallenge({ uid: 'u1', exp: 2000 })
    expect(decodeChallenge(value, 3000)).toBeNull()
    const [, sig] = value.split('.')
    const forged = Buffer.from(JSON.stringify({ uid: 'admin', exp: 9e15 })).toString('base64url')
    expect(decodeChallenge(`${forged}.${sig}`, 1000)).toBeNull()
    expect(decodeChallenge('garbage', 1000)).toBeNull()
    expect(decodeChallenge(undefined)).toBeNull()
  })
})

describe('verifySecondFactor', () => {
  beforeEach(() => jest.clearAllMocks())
  const enabled = (extra: object = {}) => ({
    twoFactorSecret: encryptSecret(RFC_SECRET),
    twoFactorEnabledAt: new Date(),
    twoFactorLastStep: null,
    twoFactorRecoveryCodes: [],
    ...extra,
  })

  it('accepts a fresh code once, then refuses the same code', async () => {
    const step = Math.floor(Date.now() / 30_000)
    prisma.user.findUnique.mockResolvedValue(enabled())
    await expect(verifySecondFactor('u1', codeAt(RFC_SECRET, step))).resolves.toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { twoFactorLastStep: step },
    })
    prisma.user.findUnique.mockResolvedValue(enabled({ twoFactorLastStep: step }))
    await expect(verifySecondFactor('u1', codeAt(RFC_SECRET, step))).resolves.toBe(false)
  })

  it('uses up a recovery code', async () => {
    const [code, other] = generateRecoveryCodes(2)
    prisma.user.findUnique.mockResolvedValue(
      enabled({ twoFactorRecoveryCodes: [hashRecoveryCode(code), hashRecoveryCode(other)] })
    )
    await expect(verifySecondFactor('u1', code)).resolves.toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { twoFactorRecoveryCodes: [hashRecoveryCode(other)] },
    })
  })

  it('refuses everything when two-step login is off', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...enabled(), twoFactorEnabledAt: null })
    await expect(verifySecondFactor('u1', '123456')).resolves.toBe(false)
  })
})
