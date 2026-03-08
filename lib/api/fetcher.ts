const API_BASE = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL ?? ''

function redirectToLoginIfNeeded() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  if (path.startsWith('/auth/')) return
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
  window.location.assign(`/auth/login?next=${next}`)
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message =
      (data as { error?: string; message?: string }).error ||
      (data as { message?: string }).message ||
      res.statusText

    if (res.status === 401) {
      redirectToLoginIfNeeded()
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
