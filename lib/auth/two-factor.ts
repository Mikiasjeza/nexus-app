/**
 * Two-step login: the sign-in challenge between the password (or provider)
 * and the session, and checking a person's second factor.
 *
 * After the first step, the browser holds a signed, HTTP-only cookie naming
 * the account for five minutes. No session exists until a valid authenticator
 * or recovery code is entered.
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { decryptSecret, hashRecoveryCode, matchStep } from './totp'

export const CHALLENGE_COOKIE = 'nexus_2fa'
const CHALLENGE_SECONDS = 5 * 60

type Challenge = { uid: string; exp: number; next?: string }

function signingKey(): Buffer {
  const base = process.env.NEXTAUTH_SECRET
  if (!base) throw new Error('NEXTAUTH_SECRET is required for two-step login')
  return createHash('sha256').update(`nexus-2fa-challenge:${base}`).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

/** "<payload>.<signature>" for a challenge; exported for tests. */
export function encodeChallenge(challenge: Challenge): string {
  const payload = Buffer.from(JSON.stringify(challenge)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** The challenge in a cookie value, if its signature is right and it hasn't expired. */
export function decodeChallenge(value: string | undefined, now = Date.now()): Challenge | null {
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const challenge = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Challenge
    if (typeof challenge.uid !== 'string' || typeof challenge.exp !== 'number') return null
    return challenge.exp > now ? challenge : null
  } catch {
    return null
  }
}

export async function startChallenge(userId: string, next?: string): Promise<void> {
  const store = await cookies()
  store.set(
    CHALLENGE_COOKIE,
    encodeChallenge({ uid: userId, exp: Date.now() + CHALLENGE_SECONDS * 1000, next }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CHALLENGE_SECONDS,
    }
  )
}

export async function readChallenge(): Promise<Challenge | null> {
  const store = await cookies()
  return decodeChallenge(store.get(CHALLENGE_COOKIE)?.value)
}

export async function clearChallenge(): Promise<void> {
  const store = await cookies()
  store.delete(CHALLENGE_COOKIE)
}

/**
 * Checks an authenticator code (each works once) or a recovery code (which is
 * then used up). True when it matched.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabledAt: true,
      twoFactorLastStep: true,
      twoFactorRecoveryCodes: true,
    },
  })
  if (!user?.twoFactorSecret || !user.twoFactorEnabledAt) return false

  const step = matchStep(decryptSecret(user.twoFactorSecret), code)
  if (step !== null) {
    if (user.twoFactorLastStep !== null && step <= user.twoFactorLastStep) return false
    await prisma.user.update({ where: { id: userId }, data: { twoFactorLastStep: step } })
    return true
  }

  const hash = hashRecoveryCode(code)
  if (code.replace(/[^a-z0-9]/gi, '').length >= 12 && user.twoFactorRecoveryCodes.includes(hash)) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== hash) },
    })
    return true
  }
  return false
}
