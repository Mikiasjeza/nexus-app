#!/usr/bin/env node

/**
 * Verifies production health endpoint readiness.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://your-domain.com npm run health:verify
 *   node scripts/verify-health.mjs https://your-domain.com
 */

const baseUrl = process.env.SMOKE_BASE_URL || process.argv[2]

if (!baseUrl) {
  console.error('Missing base URL. Set SMOKE_BASE_URL or pass URL as first arg.')
  process.exit(1)
}

function normalizeBaseUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.toString().replace(/\/$/, '')
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
}

async function run() {
  const base = normalizeBaseUrl(baseUrl)
  const healthUrl = `${base}/api/health`

  const res = await fetch(healthUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // ignored
  }

  if (!res.ok) {
    console.error(`Health endpoint failed: ${res.status} ${res.statusText}`)
    if (payload) console.error(JSON.stringify(payload, null, 2))
    process.exit(1)
  }

  const statusOk = payload?.status === 'ok'
  const dbUp = payload?.checks?.database === 'up'

  if (!statusOk || !dbUp) {
    console.error('Health gate failed. Expected status=ok and checks.database=up.')
    console.error(JSON.stringify(payload, null, 2))
    process.exit(1)
  }

  console.log('Health verification passed.')
  console.log(JSON.stringify(payload, null, 2))
}

run().catch((err) => {
  console.error('Health verification crashed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
