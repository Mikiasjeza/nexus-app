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

  create: async (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> => {
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

  /**
   * Store an evidence file on a skill. With `verify: false` the server skips
   * its own AI check because the caller will run one that includes this file.
   */
  uploadEvidence: async (
    skillId: string,
    file: File,
    options: { description?: string; type?: string; verify?: boolean } = {}
  ): Promise<{ data: { id: string; url: string | null } }> => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', options.type ?? 'file')
    if (options.description) form.append('description', options.description)
    if (options.verify === false) form.append('verify', 'false')
    return fetchApi(`/api/skills/${skillId}/evidence`, { method: 'POST', body: form })
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
