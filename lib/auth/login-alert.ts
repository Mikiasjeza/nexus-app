/**
 * "New sign-in to your account" emails.
 *
 * Each browser that signs in gets a long-lived, HTTP-only device cookie. A
 * sign-in from a browser without it is "new": we email the account holder
 * (if email is set up) and then remember the browser, so normal use doesn't
 * flood their inbox.
 */

import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { emailService } from '@/lib/email/client'
import { loginAlertEmailHtml, loginAlertEmailText } from '@/lib/email/templates'
import { emailDeliveryConfigured } from './email-verification'

export const KNOWN_DEVICE_COOKIE = 'nexus_device'
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

async function rememberDevice(): Promise<void> {
  const store = await cookies()
  store.set(KNOWN_DEVICE_COOKIE, randomBytes(16).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })
}

/** A short, readable description of the browser, e.g. "Chrome on Windows". */
export function describeDevice(userAgent: string | null): string {
  const ua = userAgent ?? ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'a browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'an unknown device'
  return `${browser} on ${os}`
}

/**
 * Call after a new account is created: its own browser is not a stranger.
 * Never throws: a cookie problem must not stop someone signing up.
 */
export async function trustThisDevice(): Promise<void> {
  try {
    await rememberDevice()
  } catch (error) {
    console.error('Could not remember this device:', error)
  }
}

/**
 * Call after a successful sign-in. Never throws: an email problem must not
 * stop someone signing in.
 */
export async function noteSignIn(
  user: { email: string; name?: string | null },
  request: Request
): Promise<void> {
  try {
    const store = await cookies()
    if (store.get(KNOWN_DEVICE_COOKIE)?.value) return
    await rememberDevice()
    if (!emailDeliveryConfigured()) return

    const details = {
      name: user.name ?? '',
      device: describeDevice(request.headers.get('user-agent')),
      when: new Date().toUTCString(),
    }
    await emailService.sendEmail({
      to: user.email,
      subject: 'New sign-in to your Nexus account',
      html: loginAlertEmailHtml(details),
      text: loginAlertEmailText(details),
    })
  } catch (error) {
    console.error('Login alert failed:', error)
  }
}
