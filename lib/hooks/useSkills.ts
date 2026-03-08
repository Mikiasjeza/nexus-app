import { useState, useEffect, useCallback } from 'react'
import { Skill } from '../types'
import { skillsApi } from '../api/skills'

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await skillsApi.getAll()
      setSkills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const addSkill = useCallback(async (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      const newSkill = await skillsApi.create(skill)
      setSkills(prev => [...prev, newSkill])
      return newSkill
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill')
      throw err
    }
  }, [])

  const updateSkill = useCallback(async (id: string, updates: Partial<Skill>) => {
    try {
      setError(null)
      const updated = await skillsApi.update(id, updates)
      setSkills(prev => prev.map(s => s.id === id ? updated : s))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skill')
      throw err
    }
  }, [])

  const deleteSkill = useCallback(async (id: string) => {
    try {
      setError(null)
      await skillsApi.delete(id)
      setSkills(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete skill')
      throw err
    }
  }, [])

  return {
    skills,
    loading,
    error,
    addSkill,
    updateSkill,
    deleteSkill,
    refetch: fetchSkills,
  }
}
