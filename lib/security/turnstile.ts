/**
 * Cloudflare Turnstile: a free, invisible "are you human?" check on sign-up,
 * contact and password-reset forms. Off until both keys are set, so the forms
 * keep working before it is configured.
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (public, shown in the page)
 *   TURNSTILE_SECRET_KEY            (server only)
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}

/** The field forms send the widget's answer in. */
export const TURNSTILE_FIELD = 'turnstileToken'

export const TURNSTILE_FAILED = 'Please complete the security check and try again.'

/**
 * True when the request passed the check, or when Turnstile is off. Fails
 * closed: if Cloudflare can't be reached, the form is refused.
 */
export async function verifyTurnstile(token: unknown, request: Request): Promise<boolean> {
  if (!turnstileEnabled()) return true
  if (typeof token !== 'string' || !token || token.length > 4096) return false

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY as string,
    response: token,
  })
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
  if (ip) body.set('remoteip', ip.split(',')[0].trim())

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body, cache: 'no-store' })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    return false
  }
}
