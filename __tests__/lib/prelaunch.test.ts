/**
 * @jest-environment node
 */

import {
  approvedLaunchDate,
  decidePrelaunchAccess,
  isPrelaunchPublic,
  prelaunchEnabled,
  prelaunchSignupAllowed,
} from '@/lib/prelaunch'

const ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ENV }
})

beforeEach(() => {
  process.env.ADMIN_EMAILS = 'owner@nexus.test'
  process.env.PRELAUNCH_ALLOWLIST = 'friend@nexus.test, Tester@Nexus.test'
})

const facts = (over: Partial<Parameters<typeof decidePrelaunchAccess>[0]> = {}) => ({
  email: 'someone@nexus.test',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  livePaidPlans: [] as string[],
  ...over,
})

describe('prelaunchEnabled', () => {
  it('is on only for the exact value "true"', () => {
    delete process.env.PRELAUNCH_MODE
    expect(prelaunchEnabled()).toBe(false)
    process.env.PRELAUNCH_MODE = '1'
    expect(prelaunchEnabled()).toBe(false)
    process.env.PRELAUNCH_MODE = 'true'
    expect(prelaunchEnabled()).toBe(true)
  })
})

describe('isPrelaunchPublic', () => {
  it.each([
    '/',
    '/coming-soon',
    '/coming-soon/opengraph-image',
    '/privacy',
    '/terms',
    '/cookies',
    '/accessibility',
    '/security',
    '/status',
    '/contact',
    '/robots.txt',
    '/sitemap.xml',
    '/auth/login',
    '/auth/reset-password',
    '/auth/verify-email',
    '/api/health',
    '/api/stripe/webhook',
    '/api/cron/jobs-sync',
    '/api/auth/login',
    '/api/auth/oauth/google/callback',
    '/api/waitlist/join',
    '/api/jobs/alerts/unsubscribe',
    '/.well-known/security.txt',
  ])('keeps %s public', (path) => {
    expect(isPrelaunchPublic(path)).toBe(true)
  })

  it.each([
    '/dashboard',
    '/assessments',
    '/assessments/python',
    '/jobs',
    '/pricing',
    '/admin',
    '/admin/waitlist',
    '/settings',
    '/api/billing/plans',
    '/api/admin/waitlist',
    '/api/stripe/checkout',
    '/privacy-extra',
    '/coming-soonish',
  ])('locks %s', (path) => {
    expect(isPrelaunchPublic(path)).toBe(false)
  })
})

describe('prelaunchSignupAllowed', () => {
  it('lets admins and allowlisted emails sign up, in any case', () => {
    expect(prelaunchSignupAllowed('OWNER@nexus.test')).toBe(true)
    expect(prelaunchSignupAllowed('friend@nexus.test')).toBe(true)
    expect(prelaunchSignupAllowed('tester@nexus.test')).toBe(true)
  })

  it('refuses everyone else', () => {
    expect(prelaunchSignupAllowed('stranger@nexus.test')).toBe(false)
  })
})

describe('decidePrelaunchAccess', () => {
  it('lets a confirmed admin in', () => {
    expect(decidePrelaunchAccess(facts({ email: 'owner@nexus.test' }))).toBe(true)
  })

  it('does not trust an admin address that was never confirmed', () => {
    expect(decidePrelaunchAccess(facts({ email: 'owner@nexus.test', emailVerified: false }))).toBe(
      false
    )
  })

  it('lets confirmed allowlisted people in', () => {
    expect(decidePrelaunchAccess(facts({ email: 'friend@nexus.test' }))).toBe(true)
    expect(decidePrelaunchAccess(facts({ email: 'friend@nexus.test', emailVerified: false }))).toBe(
      false
    )
  })

  it('keeps paying customers in, so nobody loses what they bought', () => {
    expect(decidePrelaunchAccess(facts({ livePaidPlans: ['pro'] }))).toBe(true)
    expect(decidePrelaunchAccess(facts({ livePaidPlans: ['free', 'team'] }))).toBe(true)
  })

  it('keeps free accounts out until launch', () => {
    expect(decidePrelaunchAccess(facts())).toBe(false)
    expect(decidePrelaunchAccess(facts({ livePaidPlans: ['free'] }))).toBe(false)
  })
})

describe('approvedLaunchDate', () => {
  it('shows no date until one is set', () => {
    delete process.env.LAUNCH_DATE
    expect(approvedLaunchDate()).toBeNull()
    process.env.LAUNCH_DATE = '  '
    expect(approvedLaunchDate()).toBeNull()
  })

  it('ignores a date it cannot read', () => {
    process.env.LAUNCH_DATE = 'next tuesday'
    expect(approvedLaunchDate()).toBeNull()
  })

  it('reads an ISO date', () => {
    process.env.LAUNCH_DATE = '2027-02-01T17:00:00Z'
    expect(approvedLaunchDate()?.toISOString()).toBe('2027-02-01T17:00:00.000Z')
  })
})
