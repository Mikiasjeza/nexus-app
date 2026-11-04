/**
 * @jest-environment node
 */

import {
  ENTITLEMENT_LABELS,
  PAID_PLANS,
  PLAN_INFO,
  PLAN_ORDER,
  cheapestPlanWith,
  compareIndividualPlans,
  formatPlanPrice,
  hasEntitlement,
  nextPlanForAssessments,
  normalizePlan,
} from '@/lib/plans'

describe('plan catalogue', () => {
  it('has the four plans at the agreed prices and monthly allowances', () => {
    expect(PLAN_ORDER).toEqual(['free', 'pro', 'career_plus', 'business'])
    expect(PLAN_INFO.free.price).toBe(0)
    expect(PLAN_INFO.pro.price).toBe(999)
    expect(PLAN_INFO.career_plus.price).toBe(1999)
    expect(PLAN_INFO.business.price).toBe(9900)
    expect(PLAN_INFO.free.limits.formalAssessments).toBe(1)
    expect(PLAN_INFO.pro.limits.formalAssessments).toBe(5)
    expect(PLAN_INFO.career_plus.limits.formalAssessments).toBe(12)
    expect(PLAN_INFO.business.limits.sponsoredAssessments).toBe(10)
  })

  it('sells only Free and Pro at launch; Career+ and Business are not for sale', () => {
    expect(PLAN_INFO.free.availability).toBe('available')
    expect(PLAN_INFO.pro.availability).toBe('available')
    expect(PLAN_INFO.career_plus.availability).toBe('coming_soon')
    expect(PLAN_INFO.business.availability).toBe('waitlist')
    expect(PLAN_INFO.business.audience).toBe('organization')
  })

  it('never offers an unlimited AI allowance', () => {
    for (const plan of PLAN_ORDER) {
      expect(PLAN_INFO[plan].limits.aiAnalyses).toBeGreaterThanOrEqual(0)
      expect(PLAN_INFO[plan].limits.formalAssessments).toBeGreaterThanOrEqual(0)
    }
  })

  it('highlights exactly one plan, Pro', () => {
    expect(PLAN_ORDER.filter((p) => PLAN_INFO[p].recommended)).toEqual(['pro'])
  })

  it('labels every entitlement and only uses known ones', () => {
    for (const plan of PLAN_ORDER) {
      for (const entitlement of PLAN_INFO[plan].entitlements) {
        expect(ENTITLEMENT_LABELS[entitlement]).toBeTruthy()
      }
    }
  })

  it('reads retired and unknown plan names safely', () => {
    expect(normalizePlan('enterprise')).toBe('career_plus')
    expect(normalizePlan('professional')).toBe('pro')
    expect(normalizePlan('pro')).toBe('pro')
    expect(normalizePlan('platinum')).toBe('free')
    expect(normalizePlan(null)).toBe('free')
  })

  it('points upgrade prompts at the cheapest plan that helps', () => {
    expect(cheapestPlanWith('advanced_feedback')).toBe('pro')
    expect(cheapestPlanWith('employer_assessments')).toBeNull()
    expect(nextPlanForAssessments('free')).toBe('pro')
    expect(nextPlanForAssessments('pro')).toBe('career_plus')
    expect(nextPlanForAssessments('career_plus')).toBeNull()
    expect(hasEntitlement('free', 'advanced_feedback')).toBe(false)
    expect(hasEntitlement('pro', 'detailed_reports')).toBe(true)
    expect(compareIndividualPlans('free', 'pro')).toBeGreaterThan(0)
    expect(PAID_PLANS).toEqual(['pro', 'career_plus', 'business'])
  })

  it('formats prices for display', () => {
    expect(formatPlanPrice(0)).toBe('$0')
    expect(formatPlanPrice(999)).toBe('$9.99')
    expect(formatPlanPrice(9900)).toBe('$99')
    expect(formatPlanPrice(699)).toBe('$6.99')
  })
})
