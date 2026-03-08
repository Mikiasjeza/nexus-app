/**
 * Map Prisma Skill / Evidence / SkillHistory / Activity to client types.
 */

import type { Skill, Activity } from './types'
import type { Skill as PrismaSkill, Evidence, SkillHistory, Activity as PrismaActivity } from '@prisma/client'

type PrismaSkillWithRelations = PrismaSkill & {
  evidence: Evidence[]
  history: SkillHistory[]
}

export function mapSkill(s: PrismaSkillWithRelations): Skill {
  return {
    id: s.id,
    name: s.name,
    level: s.level as Skill['level'],
    category: s.category as Skill['category'],
    progress: s.progress,
    notes: s.notes ?? undefined,
    description: s.description ?? undefined,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    tags: s.tags,
    verified: s.verified,
    order: s.order,
    visibility: (s.visibility as 'public' | 'private') || 'public',
    status: (s.status as 'draft' | 'published') || 'published',
    evidence: s.evidence.map(e => ({
      type: e.type as 'video' | 'code' | 'portfolio' | 'certificate' | 'project',
      url: (e.url ?? e.fileUrl) ?? undefined,
      description: e.description ?? undefined,
    })),
    history: s.history.map(h => ({
      id: h.id,
      skillId: h.skillId,
      timestamp: h.timestamp.toISOString(),
      changes: (h.changes as { field: string; oldValue: unknown; newValue: unknown }[]) ?? [],
    })),
  }
}

export function mapActivity(a: PrismaActivity): Activity {
  return {
    id: a.id,
    type: a.type as Activity['type'],
    skillId: a.skillId ?? undefined,
    skillName: a.skillName ?? undefined,
    message: a.message,
    timestamp: a.timestamp.toISOString(),
  }
}
