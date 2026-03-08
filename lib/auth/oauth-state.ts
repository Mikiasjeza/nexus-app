/**
 * OAuth state parameter for CSRF protection.
 * State is stored in a short-lived cookie, verified on callback.
 */

import { cookies } from 'next/headers'

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
