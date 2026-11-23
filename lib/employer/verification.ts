/**
 * The verified company badge.
 *
 * Automatic ("domain"): an owner or admin of the company has confirmed an
 * email address on the same domain as the company's website, e.g.
 * jane@acme.com for acme.com (subdomains count). Free email providers never
 * count. An admin can also verify or unverify a company by hand ("admin"),
 * which the automatic check then leaves alone.
 */

import { prisma } from '@/lib/db'

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'qq.com',
  '163.com',
  '126.com',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
])

/** "https://www.acme.com/careers" -> "acme.com"; null when not a usable web address. */
export function websiteDomain(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const host = new URL(website).hostname.toLowerCase().replace(/^www\./, '')
    return host.includes('.') ? host : null
  } catch {
    return null
  }
}

export function emailDomain(email: string): string {
  return email.split('@').pop()?.toLowerCase().trim() ?? ''
}

/** Does this confirmed email prove someone works at a company with this website? */
export function emailMatchesWebsite(email: string, website: string | null | undefined): boolean {
  const site = websiteDomain(website)
  const domain = emailDomain(email)
  if (!site || !domain || FREE_EMAIL_DOMAINS.has(domain)) return false
  return domain === site || domain.endsWith(`.${site}`) || site.endsWith(`.${domain}`)
}

/** Re-check the automatic badge for one company. Never throws. */
export async function refreshDomainVerification(companyId: string): Promise<void> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        website: true,
        verifiedAt: true,
        verifiedVia: true,
        members: {
          where: { role: { in: ['owner', 'admin'] } },
          select: { user: { select: { email: true, emailVerified: true } } },
        },
      },
    })
    if (!company || company.verifiedVia === 'admin') return
    const proven = company.members.some(
      (m) => m.user.emailVerified && emailMatchesWebsite(m.user.email, company.website)
    )
    if (proven && !company.verifiedAt) {
      await prisma.company.update({
        where: { id: companyId },
        data: { verifiedAt: new Date(), verifiedVia: 'domain' },
      })
    } else if (!proven && company.verifiedAt) {
      await prisma.company.update({
        where: { id: companyId },
        data: { verifiedAt: null, verifiedVia: null },
      })
    }
  } catch (error) {
    console.error('Company verification check failed:', error)
  }
}

/** Re-check every company this person runs, e.g. after they confirm their email. */
export async function refreshVerificationForUser(userId: string): Promise<void> {
  try {
    const memberships = await prisma.companyMember.findMany({
      where: { userId, role: { in: ['owner', 'admin'] } },
      select: { companyId: true },
    })
    await Promise.all(memberships.map((m) => refreshDomainVerification(m.companyId)))
  } catch (error) {
    console.error('Company verification check failed:', error)
  }
}
