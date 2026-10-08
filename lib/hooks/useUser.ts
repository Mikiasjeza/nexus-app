'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

type UserState = { user: User | null; loading: boolean }

// Module-level cache to avoid duplicate session fetches across components
let cached: { user: User | null } | null = null
let fetchPromise: Promise<void> | null = null
const listeners = new Set<(s: UserState) => void>()

function notify(s: UserState) {
  listeners.forEach(fn => fn(s))
}

function fetchSession(): Promise<void> {
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('/api/auth/session', { credentials: 'include' })
    .then(r => r.json())
    .then((data: { user: User | null }) => {
      cached = { user: data.user ?? null }
      notify({ user: cached.user, loading: false })
    })
    .catch(() => {
      cached = { user: null }
      notify({ user: null, loading: false })
    })
  return fetchPromise
}

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    user: cached?.user ?? null,
    loading: cached === null,
  })

  useEffect(() => {
    const update = (s: UserState) => setState(s)
    listeners.add(update)
    if (cached === null) fetchSession()
    return () => { listeners.delete(update) }
  }, [])

  return state
}

/** Call after login/logout to clear the cached session so the next useUser call re-fetches. */
export function invalidateUserCache() {
  cached = null
  fetchPromise = null
}
