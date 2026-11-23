import { createHash } from 'crypto'

/**
 * Password-reset tokens are stored as a SHA-256 hash, so someone who reads
 * the database can't use a stored value to reset a password. The token is
 * 32 random bytes, so a plain hash (no salt or slow hash) is enough.
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
