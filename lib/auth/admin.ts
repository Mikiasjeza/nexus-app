/**
 * Who counts as an admin: the accounts whose address is listed in
 * ADMIN_EMAILS. Admins can open /admin (every user's details, billing and
 * the review queue), so this is the one place that decides it.
 */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Anyone can register an address with a password, so a listed address only
 * counts once it is confirmed: the account was created through a sign-in
 * provider that verified it, or its owner opened the emailed password-reset
 * link. Otherwise registering an unused admin address would open the admin
 * area, and with it every user's details.
 *
 * Accounts older than this rule keep the access they already had.
 */
export const ADMIN_CONFIRMATION_REQUIRED_FROM = new Date('2026-11-11T00:00:00Z')

export interface AdminCandidate {
  email: string
  emailVerified: boolean
  createdAt: Date
}

export function isAdminAccount(user: AdminCandidate | null | undefined): boolean {
  if (!user || !adminEmails().includes(user.email.toLowerCase())) return false
  return user.emailVerified || user.createdAt < ADMIN_CONFIRMATION_REQUIRED_FROM
}
