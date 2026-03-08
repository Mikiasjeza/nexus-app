// Simple in-memory rate limiting (for production, use Redis or similar)

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = store[identifier]

  // Clean up expired entries
  if (entry && entry.resetTime < now) {
    delete store[identifier]
  }

  const currentEntry = store[identifier] || {
    count: 0,
    resetTime: now + options.windowMs,
  }

  if (currentEntry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentEntry.resetTime,
    }
  }

  currentEntry.count++
  store[identifier] = currentEntry

  return {
    allowed: true,
    remaining: options.maxRequests - currentEntry.count,
    resetTime: currentEntry.resetTime,
  }
}

// Cleanup old entries periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key]
      }
    })
  }, 60000) // Clean up every minute
}
