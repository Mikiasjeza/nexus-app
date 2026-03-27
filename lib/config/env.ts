type EnvMode = 'development' | 'test' | 'production'

const mode = (process.env.NODE_ENV || 'development') as EnvMode

function getRequired(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function isValidHttpUrl(value: string, requireHttps = false): boolean {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (requireHttps && parsed.protocol !== 'https:') return false
    return true
  } catch {
    return false
  }
}

/** Returns a validated app URL; never throws. Use when constructing URLs. */
export function getAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  // Reject placeholder/invalid values (e.g. user set value to variable name)
  const looksLikeUrl = raw.startsWith('http://') || raw.startsWith('https://')
  if (looksLikeUrl) {
    try {
      new URL(raw)
      return raw
    } catch {}
  }
  // Vercel sets VERCEL_URL during build (e.g. "nexus-app-xxx.vercel.app")
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }
  return mode === 'production' ? 'https://nexus.ai' : 'http://localhost:3000'
}

/** Returns a URL object for metadataBase; never throws. */
export function getMetadataBase(): URL {
  try {
    return new URL(getAppUrl())
  } catch {
    return new URL('https://nexus.ai')
  }
}

export const env = {
  mode,
  isGuestMode: process.env.GUEST_MODE === 'true' || (mode !== 'production' && process.env.GUEST_MODE !== 'false'),
  isProd: mode === 'production',
  get appUrl() {
    return getAppUrl()
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    enterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
    openAiKey: process.env.OPENAI_API_KEY || '',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  },
}

export function getSupportInbox(): string {
  return (
    process.env.CONTACT_EMAIL ||
    process.env.EMAIL_FROM ||
    'support@nexus.ai'
  ).trim()
}

export function getLaunchReadinessIssues(): string[] {
  const issues: string[] = []

  if (env.isProd) {
    if (!process.env.NEXTAUTH_SECRET) {
      issues.push('NEXTAUTH_SECRET is missing')
    }

    if (!process.env.DATABASE_URL) {
      issues.push('DATABASE_URL is missing')
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
    if (!appUrl) {
      issues.push('NEXT_PUBLIC_APP_URL is missing')
    } else if (!isValidHttpUrl(appUrl, true)) {
      issues.push('NEXT_PUBLIC_APP_URL must be a valid https URL in production')
    }
  }

  const provider = (process.env.EMAIL_PROVIDER || 'resend').trim()
  if (!process.env.EMAIL_FROM) {
    issues.push('EMAIL_FROM is missing')
  }
  if (provider === 'resend' && !process.env.RESEND_API_KEY) {
    issues.push('RESEND_API_KEY is missing')
  }
  if (provider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    issues.push('SENDGRID_API_KEY is missing')
  }
  if (provider !== 'resend' && provider !== 'sendgrid') {
    issues.push(`EMAIL_PROVIDER "${provider}" is not supported`)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push('STRIPE_SECRET_KEY is missing')
  }
  if (!process.env.STRIPE_PRO_PRICE_ID) {
    issues.push('STRIPE_PRO_PRICE_ID is missing')
  }
  if (!process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    issues.push('STRIPE_ENTERPRISE_PRICE_ID is missing')
  }

  return issues
}

export function assertProductionEnv(): void {
  if (!env.isProd) return
  getRequired('NEXTAUTH_SECRET')
  getRequired('DATABASE_URL')
  getRequired('NEXT_PUBLIC_APP_URL')
}

export function assertStripeEnv(): void {
  getRequired('STRIPE_SECRET_KEY')
  getRequired('STRIPE_PRO_PRICE_ID')
  getRequired('STRIPE_ENTERPRISE_PRICE_ID')
}

export function assertStripeWebhookEnv(): void {
  getRequired('STRIPE_WEBHOOK_SECRET')
}

export function assertAIEnv(): void {
  if (env.ai.provider === 'openai') {
    getRequired('OPENAI_API_KEY')
    return
  }
  if (env.ai.provider === 'anthropic') {
    getRequired('ANTHROPIC_API_KEY')
    return
  }
  throw new Error(`Unsupported AI_PROVIDER: ${env.ai.provider}`)
}
