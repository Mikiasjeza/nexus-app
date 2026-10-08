/**
 * Single source of truth for legal pages, the cookie banner, and the
 * third-party disclosure list. Update this file (not the pages) when a
 * vendor, contact address, or policy date changes.
 *
 * TODO before launch: replace LEGAL_ENTITY, POSTAL_ADDRESS and GOVERNING_LAW
 * with your registered company details, and have counsel review the policies.
 */

export const LEGAL = {
  productName: 'Nexus',
  LEGAL_ENTITY: 'Nexus', // e.g. "Nexus Labs, Inc."
  POSTAL_ADDRESS: '', // shown on legal pages when set
  GOVERNING_LAW: 'the State of Delaware, United States',
  effectiveDate: 'October 6, 2026',
  contact: {
    privacy: 'privacy@nexus.ai',
    legal: 'legal@nexus.ai',
    support: 'support@nexus.ai',
  },
} as const

/** Bump when the set of cookie categories changes so visitors are re-asked. */
export const CONSENT_VERSION = 1

export type CookieCategory = 'essential' | 'analytics'

export type StorageItem = {
  name: string
  kind: 'Cookie' | 'Local storage'
  category: CookieCategory
  purpose: string
  duration: string
}

/** Every cookie / browser-storage key the app sets. Keep this list exhaustive. */
export const STORAGE_ITEMS: StorageItem[] = [
  {
    name: 'nexus_session',
    kind: 'Cookie',
    category: 'essential',
    purpose: 'Keeps you signed in. HTTP-only, not readable by scripts.',
    duration: '7 days',
  },
  {
    name: 'nexus_guest_preview',
    kind: 'Cookie',
    category: 'essential',
    purpose: 'Remembers that you chose to explore the guest preview.',
    duration: '24 hours',
  },
  {
    name: 'nexus_oauth_state',
    kind: 'Cookie',
    category: 'essential',
    purpose: 'Protects "Continue with GitHub" sign-in against forgery (CSRF).',
    duration: '10 minutes',
  },
  {
    name: 'nexus-cookie-consent',
    kind: 'Local storage',
    category: 'essential',
    purpose: 'Stores your cookie choice so we do not ask again on every page.',
    duration: '12 months',
  },
  {
    name: 'sentryReplaySession',
    kind: 'Local storage',
    category: 'analytics',
    purpose:
      'Only if you allow diagnostics: lets Sentry stitch together a privacy-masked replay of the moments before an error.',
    duration: 'Until the tab is closed',
  },
]

export type Subprocessor = {
  name: string
  purpose: string
  data: string
  when: string
  policyUrl: string
}

/**
 * Third parties that receive personal data. All are called server-side except
 * Sentry, which also runs in the browser (see sentry/instrumentation configs).
 */
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Vercel',
    purpose: 'Application hosting and delivery',
    data: 'IP address and request metadata (standard server logs)',
    when: 'Every request',
    policyUrl: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Database host (PostgreSQL)',
    purpose: 'Stores your account, skills and evidence records',
    data: 'All account data listed in this policy',
    when: 'While your account exists',
    policyUrl: '',
  },
  {
    name: 'Google (Gemini API)',
    purpose: 'AI verification, career chat and job matching',
    data: 'Evidence you submit, your skill names/levels, chat messages you type and public job listings — never your name or email',
    when: 'Only when you use an AI feature',
    policyUrl: 'https://ai.google.dev/gemini-api/terms',
  },
  {
    name: 'OpenAI or Anthropic',
    purpose: 'Alternative AI providers for the same features (we use one provider at a time)',
    data: 'Same as above',
    when: 'Only when you use an AI feature',
    policyUrl: 'https://openai.com/policies/privacy-policy',
  },
  {
    name: 'Sentry',
    purpose: 'Error and performance monitoring',
    data: 'Error details, page URL and browser type. Your IP address, cookies and account details are not sent. A masked session replay (text and media hidden) is captured around errors only if you allow diagnostics.',
    when: 'When something breaks',
    policyUrl: 'https://sentry.io/privacy/',
  },
  {
    name: 'Stripe',
    purpose: 'Payments and subscription management',
    data: 'Name, email, and payment details (entered directly with Stripe — we never see card numbers)',
    when: 'Only if you start a paid plan',
    policyUrl: 'https://stripe.com/privacy',
  },
  {
    name: 'Amazon Web Services (S3)',
    purpose: 'Storage for evidence files you upload',
    data: 'Files you choose to upload',
    when: 'Only if you upload a file',
    policyUrl: 'https://aws.amazon.com/privacy/',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email (password reset)',
    data: 'Email address and the message content',
    when: 'Only when we must email you',
    policyUrl: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'GitHub',
    purpose: 'Optional "Continue with GitHub" sign-in',
    data: 'Your public GitHub profile (username, name, avatar, email)',
    when: 'Only if you choose GitHub sign-in',
    policyUrl:
      'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
  },
]
