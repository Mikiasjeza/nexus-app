export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type SkillCategory = 
  | 'Technical'
  | 'Creative'
  | 'Leadership'
  | 'Communication'
  | 'Business'
  | 'Design'
  | 'Data'
  | 'Marketing'
  | 'Other'

export interface Skill {
  id: string
  name: string
  level: SkillLevel
  category: SkillCategory
  progress: number // 0-100
  notes?: string
  description?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  verified?: boolean
  evidence?: {
    type: 'video' | 'code' | 'portfolio' | 'certificate' | 'project'
    url?: string
    description?: string
  }[]
  order?: number // For reordering
  visibility?: 'public' | 'private' // Visibility toggle
  status?: 'draft' | 'published' // Draft vs published
  history?: SkillHistoryEntry[] // Change history
}

export interface SkillHistoryEntry {
  id: string
  skillId: string
  timestamp: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  userId?: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  bio?: string
  publicProfile: boolean
  shareableId?: string
  createdAt: string
  emailVerified?: boolean
  customSlug?: string
  onboardingComplete?: boolean
  discoverableByEmployers?: boolean
}

export interface Activity {
  id: string
  type: 'skill_added' | 'skill_updated' | 'skill_deleted' | 'level_up' | 'evidence_added'
  skillId?: string
  skillName?: string
  message: string
  timestamp: string
}

export interface SkillInsight {
  skillId: string
  skillName: string
  trend: 'up' | 'down' | 'stable'
  change: number
  recommendation?: string
}

export interface Stats {
  totalSkills: number
  averageLevel: number
  skillsByCategory: Record<SkillCategory, number>
  skillsByLevel: Record<SkillLevel, number>
  recentGrowth: number
  verifiedSkills: number
}

export const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: '#ef4444', // red
  intermediate: '#f59e0b', // amber
  advanced: '#3b82f6', // blue
  expert: '#10b981', // green
}
