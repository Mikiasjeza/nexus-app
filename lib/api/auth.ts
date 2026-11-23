import type { User } from '../types'
import { fetchApi } from './fetcher'

export const authApi = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const data = await fetchApi<{ user: User | null }>('/api/auth/session')
      return data.user
    } catch {
      return null
    }
  },

  /** Signs in; resolves to { twoFactorRequired: true } when a code is needed next. */
  login: async (
    email: string,
    password: string,
    next?: string | null
  ): Promise<User & { twoFactorRequired?: boolean }> => {
    const user = await fetchApi<User & { twoFactorRequired?: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(next ? { next } : {}) }),
    })
    return user
  },

  register: async (
    email: string,
    password: string,
    name: string,
    employer?: { companyName: string },
    ageConfirmed = false,
    turnstileToken = ''
  ): Promise<User> => {
    const user = await fetchApi<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(
        employer
          ? {
              email,
              password,
              name,
              ageConfirmed,
              turnstileToken,
              accountType: 'employer',
              companyName: employer.companyName,
            }
          : { email, password, name, ageConfirmed, turnstileToken }
      ),
    })
    return user
  },

  logout: async (): Promise<void> => {
    await fetchApi<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
  },

  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const user = await fetchApi<User>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return user
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    if (!email) throw new Error('Email is required')
    await fetchApi<{ ok?: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }).catch(() => {})
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    if (!token || !newPassword) throw new Error('Token and password are required')
    await fetchApi<{ ok?: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  },

  verifyEmail: async (token: string): Promise<void> => {
    await fetchApi<{ ok: boolean }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  resendVerificationEmail: async (): Promise<void> => {
    await fetchApi<{ ok: boolean }>('/api/auth/verify-email/send', { method: 'POST' })
  },

  deleteAccount: async (): Promise<void> => {
    await fetchApi<{ ok?: boolean }>('/api/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
    })
  },

  exportData: async (): Promise<Blob> => {
    const res = await fetch('/api/auth/account/export', { credentials: 'include' })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  },

  updateShareableId: async (shareableId: string): Promise<User> => {
    return authApi.updateProfile({ shareableId })
  },
}
