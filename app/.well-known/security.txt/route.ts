import { LEGAL } from '@/lib/legal'
import { getAppUrl } from '@/lib/config/env'

/**
 * /.well-known/security.txt (RFC 9116): where security researchers report
 * problems. Expires is kept a year ahead so it never goes stale.
 */
export function GET() {
  const base = getAppUrl()
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const body = [
    `Contact: mailto:${LEGAL.contact.security}`,
    `Expires: ${expires}`,
    `Policy: ${base}/security`,
    `Canonical: ${base}/.well-known/security.txt`,
    'Preferred-Languages: en',
    '',
  ].join('\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
