import { linkedInAddToProfileUrl, linkedInShareUrl } from '@/lib/linkedin'

describe('LinkedIn links', () => {
  const credential = {
    name: 'Nexus Verified: Practical Python',
    id: 'NX-AB12-CD34-EF56',
    issuedAt: '2026-11-13T10:00:00.000Z',
    expiresAt: '2028-11-13T10:00:00.000Z',
    url: 'https://nexusverified.com/verify/NX-AB12-CD34-EF56',
  }

  it('fills in the LinkedIn certification form', () => {
    const url = new URL(linkedInAddToProfileUrl(credential))
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/profile/add')
    const p = url.searchParams
    expect(p.get('startTask')).toBe('CERTIFICATION_NAME')
    expect(p.get('name')).toBe('Nexus Verified: Practical Python')
    expect(p.get('organizationName')).toBe('Nexus')
    expect(p.get('certId')).toBe('NX-AB12-CD34-EF56')
    expect(p.get('certUrl')).toBe('https://nexusverified.com/verify/NX-AB12-CD34-EF56')
    expect(p.get('issueYear')).toBe('2026')
    expect(p.get('issueMonth')).toBe('11')
    expect(p.get('expirationYear')).toBe('2028')
    expect(p.get('expirationMonth')).toBe('11')
  })

  it('leaves out dates it cannot read', () => {
    const p = new URL(
      linkedInAddToProfileUrl({ ...credential, issuedAt: 'not a date', expiresAt: null })
    ).searchParams
    expect(p.has('issueYear')).toBe(false)
    expect(p.has('expirationYear')).toBe(false)
  })

  it('shares the credential link', () => {
    const url = new URL(linkedInShareUrl(credential.url))
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/sharing/share-offsite/')
    expect(url.searchParams.get('url')).toBe(credential.url)
  })
})
