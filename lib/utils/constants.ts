import { SkillLevel, SkillCategory } from '../types'

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Technical Skills',
  'Creative Skills',
  'Communication Skills',
  'Professional Skills',
  'Learning & Growth',
]

export const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: '#3b82f6', // blue
  intermediate: '#10b981', // green
  advanced: '#f59e0b', // amber
  expert: '#8b5cf6', // purple
}

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  'Technical Skills': '#0ea5e9',
  'Creative Skills': '#ec4899',
  'Communication Skills': '#10b981',
  'Professional Skills': '#6366f1',
  'Learning & Growth': '#f59e0b',
}

export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
}
