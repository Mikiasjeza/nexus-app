/**
 * Email verification: proves a person owns the address they signed up with.
 *
 * The link carries a random token; only its SHA-256 hash is stored (with an
 * expiry) in User.emailToken as "<hash>.<expiresAtMs>", so a database leak
 * can't be used to verify accounts. Links last 24 hours and work once.
 */

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { refreshVerificationForUser } from '@/lib/employer/verification'
import { emailService } from '@/lib/email/client'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/** Verification only applies once email can actually be sent. */
export function emailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a fresh link token for this person, replacing any earlier one. */
export async function issueVerificationToken(userId: string, now = Date.now()): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await prisma.user.update({
    where: { id: userId },
    data: { emailToken: `${hashToken(token)}.${now + TOKEN_TTL_MS}` },
  })
  return token
}

/** Sends the verification email. Throws if email isn't configured or fails. */
export async function sendVerificationEmail(user: { id: string; email: string }): Promise<void> {
  const token = await issueVerificationToken(user.id)
  await emailService.sendVerificationEmail(user.email, token)
}

export type VerifyOutcome = 'verified' | 'invalid' | 'expired'

/** Marks the email verified if the token is current; a token works once. */
export async function consumeVerificationToken(
  token: string,
  now = Date.now()
): Promise<VerifyOutcome> {
  if (!token || token.length > 200) return 'invalid'
  const hash = hashToken(token)
  const user = await prisma.user.findFirst({
    where: { emailToken: { startsWith: `${hash}.` } },
    select: { id: true, emailToken: true },
  })
  if (!user?.emailToken) return 'invalid'

  const expiresAt = Number(user.emailToken.slice(hash.length + 1))
  if (!Number.isFinite(expiresAt) || expiresAt < now) {
    await prisma.user.update({ where: { id: user.id }, data: { emailToken: null } })
    return 'expired'
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailToken: null },
  })
  await refreshVerificationForUser(user.id)
  return 'verified'
}

/**
 * The condition employer searches add so only people who confirmed their
 * email are listed. Empty until email delivery is set up, or nobody could be.
 */
export function verifiedForEmployers(): { emailVerified?: true } {
  return emailDeliveryConfigured() ? { emailVerified: true } : {}
}
