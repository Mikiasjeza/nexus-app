/**
 * Plan catalogue shared by the pricing page (client) and billing, quota and
 * entitlement code (server). Client-safe: no secrets, no Stripe SDK.
 *
 * `price` MUST equal the amount on the plan's Stripe Price. The server checks
 * that before it lets anyone buy (lib/billing/catalog.ts), so the pricing page
 * can never show one number while Stripe charges another.
 *
 * `features` lists only what the product does and enforces today. Planned
 * work goes in `comingSoon`, and a plan that isn't `available` is never sold.
 */

export type SubscriptionPlan = 'free' | 'pro' | 'career_plus' | 'business'

/** Individual plans belong to a person; organization plans to a company. */
export type PlanAudience = 'individual' | 'organization'

/**
 * available: can be bought now. coming_soon: shown with a waitlist, not sold.
 * waitlist: shown with "contact sales" and a waitlist, not sold.
 */
export type PlanAvailability = 'available' | 'coming_soon' | 'waitlist'

/** Capabilities checked on the server (lib/billing/entitlements.ts). */
export type Entitlement =
  | 'advanced_feedback'
  | 'detailed_reports'
  | 'growth_analytics'
  | 'all_practice_challenges'
  | 'career_insights'
  | 'employer_assessments'

/** How each entitlement is described to the person who has (or lacks) it. */
export const ENTITLEMENT_LABELS: Record<Entitlement, string> = {
  advanced_feedback: 'The reason and evidence behind every assessment score',
  detailed_reports: 'Detailed assessment reports you can save as PDF',
  growth_analytics: 'Skill growth analytics across your assessments',
  all_practice_challenges: 'Every practice challenge for each skill',
  career_insights: 'The AI career coach and job matching',
  employer_assessments: 'Employer-sponsored candidate assessments',
}

export interface PlanLimits {
  /** Formal (credential-bearing) assessments per calendar month, UTC. */
  formalAssessments: number
  /** AI evidence verifications per calendar month. Enforced in /api/ai/analyze. */
  aiAnalyses: number
  /** -1 = unlimited. Not enforced anywhere: enforce in POST /api/skills before lowering. */
  skills: number
  evidenceUploads: number
  /** Organization plans: candidate assessments the organization sponsors per month. */
  sponsoredAssessments: number
}

export interface PlanInfo {
  id: SubscriptionPlan
  name: string
  /** Monthly price in cents. */
  price: number
  audience: PlanAudience
  availability: PlanAvailability
  /** Highlighted on the pricing page. */
  recommended: boolean
  description: string
  features: string[]
  comingSoon: string[]
  entitlements: Entitlement[]
  limits: PlanLimits
}

const PRO_ENTITLEMENTS: Entitlement[] = [
  'advanced_feedback',
  'detailed_reports',
  'growth_analytics',
  'all_practice_challenges',
  'career_insights',
]

export const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    audience: 'individual',
    availability: 'available',
    recommended: false,
    description: 'Build your Skill Passport and earn credentials you keep.',
    features: [
      'Personal Skill Passport with a public profile link',
      '1 formal skill assessment per month',
      'Evidence-backed skill scores with basic AI feedback',
      'Verifiable skill credentials that stay valid without a subscription',
      'Practice rounds with one challenge per skill',
      'The full skill catalog',
      'Skill progress tracking and analytics',
      '10 AI evidence verifications per month',
    ],
    comingSoon: [],
    entitlements: [],
    limits: {
      formalAssessments: 1,
      aiAnalyses: 10,
      skills: -1,
      evidenceUploads: 10,
      sponsoredAssessments: 0,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    audience: 'individual',
    availability: 'available',
    recommended: true,
    description: 'For people actively proving their skills and planning their next move.',
    features: [
      'Everything in Free',
      '5 formal skill assessments per month',
      'Advanced AI feedback: the reason and evidence behind every score',
      'Detailed assessment reports you can save as PDF',
      'Skill growth analytics across your assessments',
      'Every practice challenge for each skill',
      'Career development insights from the AI career coach',
      '50 AI evidence verifications per month',
      'Priority email support',
    ],
    comingSoon: ['Personal Skill Passport customization'],
    entitlements: PRO_ENTITLEMENTS,
    limits: {
      formalAssessments: 5,
      aiAnalyses: 50,
      skills: -1,
      evidenceUploads: 100,
      sponsoredAssessments: 0,
    },
  },
  career_plus: {
    id: 'career_plus',
    name: 'Career+',
    price: 1999,
    audience: 'individual',
    availability: 'coming_soon',
    recommended: false,
    description: 'Everything in Pro plus deeper career planning. Opening once it is ready.',
    features: [
      'Everything in Pro',
      '12 formal skill assessments per month',
      '100 AI evidence verifications per month',
    ],
    comingSoon: [
      'Personalized career recommendations',
      'AI-powered skill gap analysis',
      'Career-specific learning plans',
      'Advanced portfolio analytics',
      'Detailed skill improvement recommendations',
      'Advanced Skill Passport insights',
    ],
    entitlements: PRO_ENTITLEMENTS,
    limits: {
      formalAssessments: 12,
      aiAnalyses: 100,
      skills: -1,
      evidenceUploads: 250,
      sponsoredAssessments: 0,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 9900,
    audience: 'organization',
    availability: 'waitlist',
    recommended: false,
    description: 'For hiring teams that assess candidates. Per organization, per month.',
    features: [],
    comingSoon: [
      'Employer dashboard',
      '10 candidate assessment invitations per month',
      'Job-specific assessment requests',
      'Candidate assessment reports',
      'Access to evidence candidates choose to share with you',
      'Credential verification',
      'Team member access',
      'Assessment management and invitation tracking',
    ],
    entitlements: ['employer_assessments'],
    limits: {
      formalAssessments: 0,
      aiAnalyses: 0,
      skills: -1,
      evidenceUploads: 0,
      sponsoredAssessments: 10,
    },
  },
}

/** Pricing-page order, which is also the upgrade order for individual plans. */
export const PLAN_ORDER: SubscriptionPlan[] = ['free', 'pro', 'career_plus', 'business']

export const PAID_PLANS = PLAN_ORDER.filter((plan) => PLAN_INFO[plan].price > 0)

export function isPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === 'string' && value in PLAN_INFO
}

/** Reads a stored plan name, including retired ones; anything unknown is Free. */
export function normalizePlan(value: string | null | undefined): SubscriptionPlan {
  if (value === 'enterprise') return 'career_plus'
  if (value === 'professional') return 'pro'
  return isPlan(value) ? value : 'free'
}

export function hasEntitlement(plan: SubscriptionPlan, entitlement: Entitlement): boolean {
  return PLAN_INFO[plan].entitlements.includes(entitlement)
}

/** Positive when `to` is a higher individual plan than `from`. */
export function compareIndividualPlans(from: SubscriptionPlan, to: SubscriptionPlan): number {
  return PLAN_ORDER.indexOf(to) - PLAN_ORDER.indexOf(from)
}

/** The cheapest individual plan that includes an entitlement, for upgrade prompts. */
export function cheapestPlanWith(entitlement: Entitlement): SubscriptionPlan | null {
  return (
    PLAN_ORDER.find(
      (plan) =>
        PLAN_INFO[plan].audience === 'individual' &&
        PLAN_INFO[plan].entitlements.includes(entitlement)
    ) ?? null
  )
}

/** The cheapest individual plan with a larger monthly assessment allowance. */
export function nextPlanForAssessments(plan: SubscriptionPlan): SubscriptionPlan | null {
  const current = PLAN_INFO[plan].limits.formalAssessments
  return (
    PLAN_ORDER.find(
      (candidate) =>
        PLAN_INFO[candidate].audience === 'individual' &&
        PLAN_INFO[candidate].limits.formalAssessments > current
    ) ?? null
  )
}

export function formatPlanPrice(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
}
