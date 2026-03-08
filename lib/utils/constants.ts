import { SkillLevel, SkillCategory } from '../types'

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Technical',
  'Creative',
  'Leadership',
  'Communication',
  'Business',
  'Design',
  'Data',
  'Marketing',
  'Other',
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
  Technical: '#0ea5e9',
  Creative: '#ec4899',
  Leadership: '#f59e0b',
  Communication: '#10b981',
  Business: '#6366f1',
  Design: '#8b5cf6',
  Data: '#06b6d4',
  Marketing: '#ef4444',
  Other: '#64748b',
}

export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
}
