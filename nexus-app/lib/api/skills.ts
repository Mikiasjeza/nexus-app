import type { Skill, Activity, Stats, SkillInsight } from '../types'
import { fetchApi } from './fetcher'

export const skillsApi = {
  getAll: async (): Promise<Skill[]> => {
    return fetchApi<Skill[]>('/api/skills')
  },

  getById: async (id: string): Promise<Skill | null> => {
    try {
      return await fetchApi<Skill>(`/api/skills/${id}`)
    } catch {
      return null
    }
  },

  create: async (
    skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Skill> => {
    return fetchApi<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(skill),
    })
  },

  update: async (id: string, updates: Partial<Skill>): Promise<Skill> => {
    return fetchApi<Skill>(`/api/skills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  delete: async (id: string): Promise<void> => {
    await fetchApi<undefined>(`/api/skills/${id}`, { method: 'DELETE' })
  },

  getActivities: async (limit?: number): Promise<Activity[]> => {
    const path = limit != null ? `/api/skills/activities?limit=${limit}` : '/api/skills/activities'
    return fetchApi<Activity[]>(path)
  },

  getStats: async (): Promise<Stats> => {
    return fetchApi<Stats>('/api/skills/stats')
  },

  getInsights: async (): Promise<SkillInsight[]> => {
    return fetchApi<SkillInsight[]>('/api/skills/insights')
  },
}
