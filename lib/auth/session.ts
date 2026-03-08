/**
 * Server-side session helpers for API routes.
 * Uses HTTP-only cookie + Prisma Session store.
 */

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const COOKIE_NAME = 'nexus_session'
const SESSION_MAX_AGE_DAYS = 7

function getToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  for (let i = 0; i < 32; i++) result += chars[bytes[i]! % chars.length]
  return result
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null
  return token
}

export async function getSessionUserId(): Promise<string | null> {
  const token = await getSessionToken()
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  })
  const isExpired = Boolean(session && session.expiresAt < new Date())
  if (!session || isExpired) return null
  return session.userId
}

export async function createSession(userId: string): Promise<string> {
  const token = getToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS)

  await prisma.session.create({
    data: { userId, token, expiresAt },
  })
  return token
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export { COOKIE_NAME, SESSION_MAX_AGE_DAYS }
