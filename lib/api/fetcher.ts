const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL ?? '')

export const browserLocation = {
  get pathname() {
    return typeof window === 'undefined' ? '' : window.location.pathname
  },
  get search() {
    return typeof window === 'undefined' ? '' : window.location.search
  },
  assign(url: string) {
    if (typeof window !== 'undefined') {
      window.location.assign(url)
    }
  },
}

function redirectToLoginIfNeeded() {
  if (typeof window === 'undefined') return
  const path = browserLocation.pathname
  if (path.startsWith('/auth/')) return
  const next = encodeURIComponent(`${browserLocation.pathname}${browserLocation.search}`)
  browserLocation.assign(`/auth/login?next=${next}`)
}

/** A failed API call: the server's message, plus its status and body for callers that branch on them. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: Record<string, unknown> = {}
  ) {
    super(message)
  }

  /** The server says a paid plan is needed (or this month's allowance is used up). */
  get upgradeTo(): string | null {
    const value = this.data.upgradeTo
    return typeof value === 'string' ? value : null
  }

  get code(): string | null {
    return typeof this.data.code === 'string' ? this.data.code : null
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Multipart bodies need the browser to set Content-Type (with its boundary).
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    throw new ApiError(message, res.status, data as Record<string, unknown>)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
