/**
 * Links that open LinkedIn with a Nexus credential filled in. Both are plain
 * LinkedIn URLs: no LinkedIn app, keys or approval are needed, and nothing is
 * sent to LinkedIn until the person saves or posts it there themselves.
 */

/** The issuer name LinkedIn shows under the certification. */
export const LINKEDIN_ISSUER = 'Nexus'

export type LinkedInCredential = {
  /** What the certification is called on the profile, e.g. "Practical Python". */
  name: string
  /** The credential id, e.g. NX-AB12-CD34-EF56. */
  id: string
  /** ISO date the credential was issued. */
  issuedAt: string
  /** ISO date it stops being valid, if it does. */
  expiresAt?: string | null
  /** Full public address of the credential check page. */
  url: string
}

function yearMonth(iso: string): { year: string; month: string } | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return { year: String(date.getUTCFullYear()), month: String(date.getUTCMonth() + 1) }
}

/**
 * LinkedIn's "Add license or certification" form, pre-filled. The person
 * reviews it and clicks Save on LinkedIn.
 */
export function linkedInAddToProfileUrl(credential: LinkedInCredential): string {
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: credential.name,
    organizationName: LINKEDIN_ISSUER,
    certUrl: credential.url,
    certId: credential.id,
  })
  const issued = yearMonth(credential.issuedAt)
  if (issued) {
    params.set('issueYear', issued.year)
    params.set('issueMonth', issued.month)
  }
  const expires = credential.expiresAt ? yearMonth(credential.expiresAt) : null
  if (expires) {
    params.set('expirationYear', expires.year)
    params.set('expirationMonth', expires.month)
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

/** LinkedIn's share box with a link to the credential, for a post. */
export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url }).toString()}`
}
