/**
 * OAuth state parameter for CSRF protection.
 * State is stored in a short-lived cookie, verified on callback.
 */

import { cookies } from 'next/headers'
import type { OAuthFlow } from './oauth/flow'

const COOKIE_NAME = 'nexus_oauth_state'
const MAX_AGE = 600 // 10 minutes

function randomState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const bytes = new Uint8Array(24)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  for (let i = 0; i < 24; i++) result += chars[bytes[i]! % chars.length]
  return result
}

export function generateState(): string {
  return randomState()
}

export async function setStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function verifyState(incoming: string | null): Promise<boolean> {
  if (!incoming) return false
  const cookieStore = await cookies()
  const stored = cookieStore.get(COOKIE_NAME)?.value ?? null
  cookieStore.delete(COOKIE_NAME)
  return stored !== null && stored === incoming
}

/**
 * Provider sign-in (lib/auth/oauth) keeps its whole round trip in the same
 * cookie: the state, plus the one-time values that tie the provider's answer
 * to this browser. The cookie is the person's own, so nothing in it is ever
 * trusted to say WHO they are; the callback takes that from the session.
 */
export async function saveOAuthFlow(flow: OAuthFlow): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

const text = (value: unknown, max = 512): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max
const textOrNull = (value: unknown, max = 512): value is string | null =>
  value === null || text(value, max)

/** Read the flow and clear it: each one is good for a single callback. */
export async function takeOAuthFlow(): Promise<OAuthFlow | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null
  cookieStore.delete(COOKIE_NAME)
  try {
    const flow: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!flow || typeof flow !== 'object') return null
    const { provider, state, nonce, verifier, mode, userId, next } = flow as Record<string, unknown>
    if (!text(provider, 32) || !text(state) || !textOrNull(nonce) || !textOrNull(verifier))
      return null
    if (mode !== 'signin' && mode !== 'connect') return null
    if (!textOrNull(userId, 64) || !textOrNull(next)) return null
    return { provider, state, nonce, verifier, mode, userId, next }
  } catch {
    return null
  }
}
