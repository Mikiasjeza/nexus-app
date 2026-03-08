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

  login: async (email: string, password: string): Promise<User> => {
    const user = await fetchApi<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return user
  },

  register: async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    const user = await fetchApi<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
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

  verifyEmail: async (_token: string): Promise<void> => {
    await Promise.resolve()
  },

  resendVerificationEmail: async (): Promise<void> => {
    await Promise.resolve()
  },

  deleteAccount: async (): Promise<void> => {
    await fetchApi<{ ok?: boolean }>('/api/auth/account', {
      method: 'DELETE',
    })
  },

  exportData: async (): Promise<Blob> => {
    const res = await fetch('/api/analytics/export', { credentials: 'include' })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  },

  updateShareableId: async (shareableId: string): Promise<User> => {
    return authApi.updateProfile({ shareableId })
  },
}
