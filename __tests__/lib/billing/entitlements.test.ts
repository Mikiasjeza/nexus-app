/**
 * @jest-environment node
 */

const mockEffectivePlan = jest.fn()
const mockAllowance = jest.fn()
const mockDb = {
  subscription: { findUnique: jest.fn() },
  usagePeriod: { findUnique: jest.fn() },
}

jest.mock('@/lib/plan-usage', () => ({
  getEffectivePlan: (...a: unknown[]) => mockEffectivePlan(...a),
}))
jest.mock('@/lib/billing/usage', () => ({
  getAllowanceSummary: (...a: unknown[]) => mockAllowance(...a),
}))
jest.mock('@/lib/db', () => ({
  get prisma() {
    return mockDb
  },
}))

import {
  canAccessAdvancedFeedback,
  canAccessCareerInsights,
  canCreateEmployerAssessment,
  canExportDetailedReport,
  canStartFormalAssessment,
  canUseAllPracticeChallenges,
  decideFor,
  upgradeRequiredBody,
} from '@/lib/billing/entitlements'

beforeEach(() => {
  jest.clearAllMocks()
  mockEffectivePlan.mockResolvedValue('free')
})

describe('feature entitlements', () => {
  it('denies paid features on Free and names Pro as the upgrade', async () => {
    for (const check of [
      canAccessAdvancedFeedback,
      canExportDetailedReport,
      canAccessCareerInsights,
    ]) {
      const decision = await check('u1')
      expect(decision).toMatchObject({ allowed: false, plan: 'free', upgradeTo: 'pro' })
    }
  })

  it('allows them on Pro and Career+', async () => {
    for (const plan of ['pro', 'career_plus']) {
      mockEffectivePlan.mockResolvedValue(plan)
      expect((await canAccessAdvancedFeedback('u1')).allowed).toBe(true)
      expect((await canExportDetailedReport('u1')).allowed).toBe(true)
    }
  })

  it('gives guests and Free the limited practice pool', async () => {
    expect(await canUseAllPracticeChallenges(null)).toBe(false)
    expect(await canUseAllPracticeChallenges('u1')).toBe(false)
    mockEffectivePlan.mockResolvedValue('pro')
    expect(await canUseAllPracticeChallenges('u1')).toBe(true)
  })

  it('answers denied requests the same way everywhere', () => {
    const decision = decideFor('free', 'growth_analytics')
    if (decision.allowed) throw new Error('expected a denial')
    expect(upgradeRequiredBody(decision)).toEqual({
      error: 'Skill growth analytics are part of Pro.',
      code: 'upgrade_required',
      plan: 'free',
      upgradeTo: 'pro',
    })
  })
})

describe('canStartFormalAssessment', () => {
  it('allows while the month has assessments left', async () => {
    mockAllowance.mockResolvedValue({
      plan: 'free',
      limit: 1,
      used: 0,
      remaining: 1,
      upgradeTo: 'pro',
    })
    await expect(canStartFormalAssessment('u1')).resolves.toMatchObject({ allowed: true })
  })

  it('denies at the limit and offers the next plan up', async () => {
    mockAllowance.mockResolvedValue({
      plan: 'pro',
      limit: 5,
      used: 5,
      remaining: 0,
      upgradeTo: 'career_plus',
    })
    await expect(canStartFormalAssessment('u1')).resolves.toMatchObject({
      allowed: false,
      upgradeTo: 'career_plus',
    })
  })
})

describe('canCreateEmployerAssessment', () => {
  it('needs an active Business plan on the organization', async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null)
    await expect(canCreateEmployerAssessment('c1')).resolves.toMatchObject({ allowed: false })
  })

  it('stays off while Business is not on sale, even for a paying organization', async () => {
    mockDb.subscription.findUnique.mockResolvedValue({ plan: 'business', status: 'active' })
    await expect(canCreateEmployerAssessment('c1')).resolves.toMatchObject({
      allowed: false,
      reason: "Employer assessments aren't available yet.",
    })
  })
})
