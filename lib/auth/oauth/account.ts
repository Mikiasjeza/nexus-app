/**
 * Which Nexus account a provider sign-in belongs to.
 *
 * The rules, and why:
 *
 * 1. An account is matched ONLY by the provider's permanent id for the person.
 *    Email is never used to find an account. Anyone can put a victim's address
 *    on a provider profile, so matching on it would hand over the account.
 * 2. A new account is created only from an address the provider itself has
 *    verified, and only when no account uses that address yet.
 * 3. If an account with that address already exists, nothing is linked. The
 *    owner signs in the way they already do and links the provider from
 *    Settings, or resets their password by email, which proves the mailbox is
 *    theirs and clears every older way in (app/api/auth/reset-password).
 *
 *    One exception: the provider runs the mailbox itself (Gmail, or the
 *    address's own Google Workspace) AND the account's address was already
 *    confirmed. Both then say it is the same person, so the provider is linked
 *    and they are signed in. This is how people who used to sign in with
 *    GitHub get back in. An unconfirmed account is never linked this way:
 *    anyone can register someone else's address with a password and wait.
 */

import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { ProviderProfile, SignInProviderId } from './providers'

export type SignInOutcome =
  | { kind: 'signed_in'; userId: string; isNew: boolean; onboardingComplete: boolean }
  | { kind: 'refused'; reason: 'email_unverified' | 'account_exists' }

export type ConnectOutcome = { kind: 'connected' } | { kind: 'refused'; reason: 'already_linked' }

/** Kept with the link so Settings can say which provider account it is. */
const metadataOf = (profile: ProviderProfile) => ({ email: profile.email })

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

/** Sign in the linked account, or create one from a provider-verified address. */
export async function signInWithProvider(
  provider: SignInProviderId,
  profile: ProviderProfile
): Promise<SignInOutcome> {
  const linked = await prisma.oAuthConnection.findFirst({
    where: { provider, providerId: profile.providerId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, user: { select: { onboardingComplete: true } } },
  })
  if (linked) {
    await prisma.oAuthConnection.update({
      where: { id: linked.id },
      data: { metadata: metadataOf(profile) },
    })
    return {
      kind: 'signed_in',
      userId: linked.userId,
      isNew: false,
      onboardingComplete: linked.user.onboardingComplete,
    }
  }

  if (!profile.email || !profile.emailVerified)
    return { kind: 'refused', reason: 'email_unverified' }

  const taken = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, emailVerified: true, onboardingComplete: true },
  })
  if (taken) {
    if (!profile.emailAuthoritative || !taken.emailVerified) {
      return { kind: 'refused', reason: 'account_exists' }
    }
    try {
      await prisma.oAuthConnection.create({
        data: {
          userId: taken.id,
          provider,
          providerId: profile.providerId,
          metadata: metadataOf(profile),
        },
      })
    } catch (error) {
      // They already linked a different account from this provider.
      if (isUniqueViolation(error)) return { kind: 'refused', reason: 'account_exists' }
      throw error
    }
    return {
      kind: 'signed_in',
      userId: taken.id,
      isNew: false,
      onboardingComplete: taken.onboardingComplete,
    }
  }

  // Nobody knows this password: the account is entered through the provider,
  // or by setting a password with the emailed reset link.
  const passwordHash = await bcrypt.hash(`oauth_${randomUUID()}`, 10)
  try {
    const user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        passwordHash,
        emailVerified: true, // verified by the provider
        onboardingComplete: false,
        oauthConnections: {
          create: { provider, providerId: profile.providerId, metadata: metadataOf(profile) },
        },
        subscriptions: { create: { plan: 'free', status: 'active' } },
      },
      select: { id: true },
    })
    return { kind: 'signed_in', userId: user.id, isNew: true, onboardingComplete: false }
  } catch (error) {
    // Lost a race with another sign-up using the same address.
    if (isUniqueViolation(error)) return { kind: 'refused', reason: 'account_exists' }
    throw error
  }
}

/**
 * Link a provider account to the signed-in user ("Connect" in Settings).
 * `userId` must come from the session, never from the request.
 */
export async function connectProvider(
  userId: string,
  provider: SignInProviderId,
  profile: ProviderProfile
): Promise<ConnectOutcome> {
  const existing = await prisma.oAuthConnection.findFirst({
    where: { provider, providerId: profile.providerId },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  })
  if (existing && existing.userId !== userId) return { kind: 'refused', reason: 'already_linked' }

  await prisma.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, providerId: profile.providerId, metadata: metadataOf(profile) },
    update: { providerId: profile.providerId, metadata: metadataOf(profile) },
  })
  return { kind: 'connected' }
}
