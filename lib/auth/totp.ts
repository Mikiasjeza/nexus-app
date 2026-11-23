/**
 * Time-based one-time passwords (RFC 6238): the 6-digit codes authenticator
 * apps show, plus the helpers two-step login needs around them.
 *
 * Secrets are encrypted at rest with AES-256-GCM under a key derived from
 * NEXTAUTH_SECRET, so a database leak alone doesn't reveal them. Changing
 * NEXTAUTH_SECRET makes existing secrets unreadable: everyone with two-step
 * login would have to sign in with a recovery code and set it up again.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto'

const STEP_SECONDS = 30
const DIGITS = 6
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** A new random secret, base32 as authenticator apps expect. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

/** The code for one 30-second step (RFC 4226 HOTP over the step counter). */
export function codeAt(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  return String(binary % 10 ** digits).padStart(digits, '0')
}

/**
 * The step a code matches, allowing one step either side for clock drift, or
 * null. Callers reject a step already used, so each code works once.
 */
export function matchStep(secret: string, code: string, now = Date.now()): number | null {
  const clean = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return null
  const current = Math.floor(now / 1000 / STEP_SECONDS)
  for (const step of [current, current - 1, current + 1]) {
    const expected = codeAt(secret, step)
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step
  }
  return null
}

/** The otpauth:// address an authenticator app scans from the QR code. */
export function otpauthUrl(secret: string, accountEmail: string, issuer = 'Nexus'): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params}`
}

// ----- Encryption at rest -----

function encryptionKey(): Buffer {
  const base = process.env.NEXTAUTH_SECRET
  if (!base) throw new Error('NEXTAUTH_SECRET is required for two-step login')
  return createHash('sha256').update(`nexus-2fa:${base}`).digest()
}

/** "iv.tag.ciphertext", all base64url. */
export function encryptSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

// ----- Recovery codes -----

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no look-alikes

/** Ten one-time codes like "k7m2-x9pq-4tnz", shown once at setup. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(12)
    const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
    return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
  })
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256')
    .update(code.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .digest('hex')
}
