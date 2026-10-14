import type { Activity, Skill, SkillInsight, Stats, User } from '@/lib/types'

const now = new Date().toISOString()

export const guestUser: User = {
  id: 'guest-user',
  email: 'guest@nexus.local',
  name: 'Guest User',
  publicProfile: false,
  createdAt: now,
  emailVerified: false,
  onboardingComplete: true,
  discoverableByEmployers: false,
}

export const guestSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'React Development',
    level: 'advanced',
    category: 'Technical Skills',
    progress: 82,
    createdAt: now,
    updatedAt: now,
    tags: ['frontend', 'react', 'typescript'],
    verified: true,
    visibility: 'public',
    status: 'published',
  },
  {
    id: 'skill-2',
    name: 'Product Design',
    level: 'intermediate',
    category: 'Creative Skills',
    progress: 67,
    createdAt: now,
    updatedAt: now,
    tags: ['figma', 'ux'],
    verified: false,
    visibility: 'public',
    status: 'published',
  },
  {
    id: 'skill-3',
    name: 'Team Leadership',
    level: 'expert',
    category: 'Professional Skills',
    progress: 91,
    createdAt: now,
    updatedAt: now,
    tags: ['management', 'communication'],
    verified: true,
    visibility: 'public',
    status: 'published',
  },
]

export const guestActivities: Activity[] = [
  {
    id: 'activity-1',
    type: 'skill_added',
    skillId: 'skill-1',
    skillName: 'React Development',
    message: 'Added React Development skill',
    timestamp: now,
  },
  {
    id: 'activity-2',
    type: 'level_up',
    skillId: 'skill-3',
    skillName: 'Team Leadership',
    message: 'Leveled up Team Leadership',
    timestamp: now,
  },
]

export const guestInsights: SkillInsight[] = [
  {
    skillId: 'skill-1',
    skillName: 'React Development',
    trend: 'up',
    change: 8,
    recommendation: 'Ship one more project with tests to unlock expert confidence.',
  },
  {
    skillId: 'skill-2',
    skillName: 'Product Design',
    trend: 'stable',
    change: 2,
    recommendation: 'Add two case studies to strengthen your design proof.',
  },
]

export const guestStats: Stats = {
  totalSkills: 3,
  averageLevel: 80,
  skillsByCategory: {
    'Technical Skills': 1,
    'Creative Skills': 1,
    'Communication Skills': 0,
    'Professional Skills': 1,
    'Learning & Growth': 0,
  },
  skillsByLevel: {
    beginner: 0,
    intermediate: 1,
    advanced: 1,
    expert: 1,
  },
  recentGrowth: 2,
  verifiedSkills: 2,
}
