#!/usr/bin/env node

/**
 * Production smoke test runner.
 *
 * Required:
 *   SMOKE_BASE_URL
 *
 * Optional (for authenticated checks):
 *   SMOKE_EMAIL
 *   SMOKE_PASSWORD
 *
 * Optional toggles:
 *   SMOKE_RUN_AI=true
 *   SMOKE_RUN_STRIPE=true
 */

const cfg = {
  baseUrl: process.env.SMOKE_BASE_URL || process.argv[2],
  email: process.env.SMOKE_EMAIL || '',
  password: process.env.SMOKE_PASSWORD || '',
  runAI: process.env.SMOKE_RUN_AI === 'true',
  runStripe: process.env.SMOKE_RUN_STRIPE === 'true',
}

if (!cfg.baseUrl) {
  console.error('Missing SMOKE_BASE_URL (or first CLI arg URL).')
  process.exit(1)
}

function normalizeBaseUrl(url) {
  try {
    return new URL(url).toString().replace(/\/$/, '')
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function request(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: opts.redirect || 'manual',
    cache: 'no-store',
  })

  const setCookie = res.headers.get('set-cookie') || ''
  const location = res.headers.get('location') || ''
  let json = null
  try {
    json = await res.json()
  } catch {
    // no json body
  }

  return { res, status: res.status, ok: res.ok, json, setCookie, location }
}

function cookieFromSetCookie(raw) {
  const first = raw.split(',')[0] || ''
  const pair = first.split(';')[0] || ''
  return pair.includes('=') ? pair : ''
}

async function run() {
  const base = normalizeBaseUrl(cfg.baseUrl)
  console.log(`Running production smoke tests for: ${base}`)

  // 1) Health check gate
  const health = await request(base, '/api/health')
  assert(health.ok, `Health failed: ${health.status}`)
  assert(health.json?.status === 'ok', 'Health status is not ok')
  assert(health.json?.checks?.database === 'up', 'Database check is not up')
  console.log('✓ Health endpoint is healthy')

  // 2) Version endpoint
  const version = await request(base, '/api/version')
  assert(version.ok, `Version endpoint failed: ${version.status}`)
  console.log('✓ Version endpoint responds')

  // 3) Protected route redirect (unauthenticated)
  const protectedPage = await request(base, '/dashboard')
  assert([307, 308].includes(protectedPage.status), 'Expected redirect for unauthenticated /dashboard')
  assert(protectedPage.location.includes('/auth/login'), 'Protected redirect does not go to login')
  console.log('✓ Protected-route redirect works')

  if (!cfg.email || !cfg.password) {
    console.log('ℹ Skipping authenticated checks (set SMOKE_EMAIL and SMOKE_PASSWORD to enable).')
    console.log('Smoke test completed.')
    return
  }

  // 4) Login
  const login = await request(base, '/api/auth/login', {
    method: 'POST',
    body: { email: cfg.email, password: cfg.password },
  })
  assert(login.ok, `Login failed: ${login.status} ${login.json?.error || ''}`)
  const sessionCookie = cookieFromSetCookie(login.setCookie)
  assert(sessionCookie.startsWith('nexus_session='), 'Login did not return nexus_session cookie')
  console.log('✓ Login succeeded')

  // 5) Session endpoint
  const session = await request(base, '/api/auth/session', { cookie: sessionCookie })
  assert(session.ok, `Session failed: ${session.status}`)
  assert(session.json?.user?.id, 'Session user missing')
  console.log('✓ Session endpoint returns authenticated user')

  // 6) Forgot password route
  const forgotPassword = await request(base, '/api/auth/forgot-password', {
    method: 'POST',
    body: { email: cfg.email },
  })
  assert(forgotPassword.ok, `Forgot-password failed: ${forgotPassword.status}`)
  console.log('✓ Forgot-password endpoint responds')

  // 7) Skills CRUD
  const createdName = `launch-smoke-${Date.now()}`
  const createSkill = await request(base, '/api/skills', {
    method: 'POST',
    cookie: sessionCookie,
    body: {
      name: createdName,
      level: 'beginner',
      category: 'Technical',
      progress: 10,
      notes: 'Launch smoke test skill',
      description: 'Created by smoke test',
      tags: ['smoke'],
      visibility: 'private',
      status: 'draft',
    },
  })
  assert(createSkill.ok, `Create skill failed: ${createSkill.status}`)
  const skillId = createSkill.json?.id
  assert(skillId, 'Created skill id missing')
  console.log('✓ Skill create works')

  const updateSkill = await request(base, `/api/skills/${skillId}`, {
    method: 'PATCH',
    cookie: sessionCookie,
    body: { progress: 25 },
  })
  assert(updateSkill.ok, `Update skill failed: ${updateSkill.status}`)
  console.log('✓ Skill update works')

  if (cfg.runAI) {
    const analyze = await request(base, '/api/ai/analyze', {
      method: 'POST',
      cookie: sessionCookie,
      body: {
        skillId,
        skillName: createdName,
        skillLevel: 'beginner',
        evidence: [
          {
            type: 'text',
            content: 'Built and shipped a small Next.js feature with API integration.',
          },
        ],
      },
    })
    assert(analyze.ok, `AI analyze failed: ${analyze.status} ${analyze.json?.error || ''}`)
    assert(analyze.json?.success === true, 'AI analyze response did not report success')
    console.log('✓ AI analyze endpoint works')
  } else {
    console.log('ℹ Skipping AI analyze check (set SMOKE_RUN_AI=true to enable).')
  }

  if (cfg.runStripe) {
    const checkout = await request(base, '/api/stripe/checkout', {
      method: 'POST',
      cookie: sessionCookie,
      body: { planId: 'professional' },
    })
    assert(checkout.ok, `Stripe checkout failed: ${checkout.status}`)
    assert(typeof checkout.json?.url === 'string' && checkout.json.url.startsWith('https://'), 'Checkout URL missing')
    console.log('✓ Stripe checkout session works')

    const portal = await request(base, '/api/stripe/portal', {
      method: 'POST',
      cookie: sessionCookie,
    })
    assert(portal.ok, `Stripe portal failed: ${portal.status}`)
    assert(typeof portal.json?.url === 'string' && portal.json.url.startsWith('https://'), 'Portal URL missing')
    console.log('✓ Stripe billing portal session works')
  } else {
    console.log('ℹ Skipping Stripe checks (set SMOKE_RUN_STRIPE=true to enable).')
  }

  const deleteSkill = await request(base, `/api/skills/${skillId}`, {
    method: 'DELETE',
    cookie: sessionCookie,
  })
  assert(deleteSkill.status === 204, `Delete skill failed: ${deleteSkill.status}`)
  console.log('✓ Skill delete works')

  const logout = await request(base, '/api/auth/logout', {
    method: 'POST',
    cookie: sessionCookie,
  })
  assert(logout.ok, `Logout failed: ${logout.status}`)
  console.log('✓ Logout works')

  console.log('Smoke test completed successfully.')
}

run().catch((err) => {
  console.error('Smoke test failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
