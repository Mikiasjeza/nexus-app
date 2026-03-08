type EnvMode = 'development' | 'test' | 'production'

const mode = (process.env.NODE_ENV || 'development') as EnvMode

function getRequired(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/** Returns a validated app URL; never throws. Use when constructing URLs. */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || ''
  try {
    if (raw && raw.startsWith('http')) {
      new URL(raw)
      return raw
    }
  } catch {}
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
