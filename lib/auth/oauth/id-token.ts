/**
 * Reading what a sign-in provider says about a person: the ID token's claims
 * and the checks they must pass, plus tidy-up of the email and name.
 */

import { timingSafeEqual } from 'crypto'

export type Claims = Record<string, unknown>

/** A sign-in that could not be completed. `code` is safe to log; it never holds a token. */
export class OAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'OAuthError'
  }
}

/** Clocks differ a little between servers. */
const CLOCK_SKEW_MS = 60_000

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * The claims inside an ID token.
 *
 * The signature is not re-checked: the token is only ever read straight from
 * the provider's token endpoint, over TLS, in exchange for our client secret.
 * OpenID Connect Core §3.1.3.7 allows the TLS connection to vouch for the
 * token in that case. Never use this on a token that arrived any other way.
 */
export function decodeIdToken(token: string): Claims {
  const parts = token.split('.')
  if (parts.length !== 3) throw new OAuthError('bad_id_token', 'The ID token is not a JWT')
  try {
    const claims: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (!claims || typeof claims !== 'object' || Array.isArray(claims))
      throw new Error('not an object')
    return claims as Claims
  } catch {
    throw new OAuthError('bad_id_token', 'The ID token payload is unreadable')
  }
}

export interface IdTokenChecks {
  /** Is this issuer the provider we asked? Gets the claims too, for per-tenant issuers. */
  issuer: (iss: string, claims: Claims) => boolean
  clientId: string
  /** The one-time value sent with the request, or null when the provider doesn't echo one. */
  nonce: string | null
  now: number
}

/** Throws unless the token was issued by the provider, for this app, for this sign-in, and is current. */
export function assertIdToken(claims: Claims, checks: IdTokenChecks): Claims & { sub: string } {
  const { iss, aud, azp, exp, iat, nonce, sub } = claims

  if (typeof iss !== 'string' || !checks.issuer(iss, claims)) {
    throw new OAuthError('bad_issuer', 'The ID token came from an unexpected issuer')
  }

  const audiences = Array.isArray(aud) ? aud : [aud]
  if (!audiences.includes(checks.clientId)) {
    throw new OAuthError('bad_audience', 'The ID token was issued for a different app')
  }
  if ((audiences.length > 1 || azp !== undefined) && azp !== checks.clientId) {
    throw new OAuthError('bad_audience', 'The ID token was issued to a different app')
  }

  if (typeof exp !== 'number' || exp * 1000 <= checks.now - CLOCK_SKEW_MS) {
    throw new OAuthError('expired_id_token', 'The ID token has expired')
  }
  if (typeof iat === 'number' && iat * 1000 > checks.now + CLOCK_SKEW_MS) {
    throw new OAuthError('bad_id_token', 'The ID token is dated in the future')
  }

  if (checks.nonce !== null && (typeof nonce !== 'string' || !safeEqual(nonce, checks.nonce))) {
    throw new OAuthError('bad_nonce', 'The ID token belongs to a different sign-in')
  }

  if (typeof sub !== 'string' || sub.length === 0 || sub.length > 255) {
    throw new OAuthError('bad_id_token', 'The ID token names nobody')
  }
  return claims as Claims & { sub: string }
}

/** A lower-cased email address, or null when the value isn't one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

/** Providers send booleans, but some send them as text. */
export function isTrue(value: unknown): boolean {
  return value === true || value === 'true'
}

/** The first usable name among the candidates, trimmed to what an account can hold. */
export function cleanName(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const name = candidate
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    if (name) return name
  }
  return null
}
