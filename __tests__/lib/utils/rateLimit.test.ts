import { rateLimit } from '@/lib/utils/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows requests within limit', () => {
    const result = rateLimit('test-key', { maxRequests: 3, windowMs: 60000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('blocks when limit exceeded', () => {
    rateLimit('block-key', { maxRequests: 2, windowMs: 60000 })
    rateLimit('block-key', { maxRequests: 2, windowMs: 60000 })
    const result = rateLimit('block-key', { maxRequests: 2, windowMs: 60000 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after window', () => {
    rateLimit('reset-key', { maxRequests: 1, windowMs: 1000 })
    const blocked = rateLimit('reset-key', { maxRequests: 1, windowMs: 1000 })
    expect(blocked.allowed).toBe(false)

    jest.advanceTimersByTime(1001)
    const allowed = rateLimit('reset-key', { maxRequests: 1, windowMs: 1000 })
    expect(allowed.allowed).toBe(true)
  })
})
