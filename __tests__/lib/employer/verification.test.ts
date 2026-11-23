/**
 * @jest-environment node
 */

import { emailMatchesWebsite, websiteDomain } from '@/lib/employer/verification'

jest.mock('@/lib/db', () => ({ prisma: {} }))

describe('verified company badge: email domain check', () => {
  it('reads the domain from a website', () => {
    expect(websiteDomain('https://www.acme.com/careers')).toBe('acme.com')
    expect(websiteDomain('not a url')).toBeNull()
    expect(websiteDomain('')).toBeNull()
  })

  it('matches an email on the same domain or a subdomain', () => {
    expect(emailMatchesWebsite('jane@acme.com', 'https://acme.com')).toBe(true)
    expect(emailMatchesWebsite('jane@eu.acme.com', 'https://www.acme.com')).toBe(true)
  })

  it('never counts free email providers or other domains', () => {
    expect(emailMatchesWebsite('jane@gmail.com', 'https://gmail.com')).toBe(false)
    expect(emailMatchesWebsite('jane@acme.co', 'https://acme.com')).toBe(false)
    expect(emailMatchesWebsite('jane@notacme.com', 'https://acme.com')).toBe(false)
    expect(emailMatchesWebsite('jane@acme.com', null)).toBe(false)
  })
})
