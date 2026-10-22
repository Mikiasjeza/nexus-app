'use client'

import { Skill } from '@/lib/types'
import SkillCard from './SkillCard'

interface SkillGridProps {
  skills: Skill[]
  onEdit: (skill: Skill) => void
  onDelete: (id: string) => void
  filterCategory?: string
  filterLevel?: string
  searchQuery?: string
  viewMode?: 'grid' | 'list'
  /** Shown when nothing matches; the page knows whether filters are on. */
  emptyMessage?: string
}

export default function SkillGrid({
  skills,
  onEdit,
  onDelete,
  filterCategory,
  filterLevel,
  searchQuery = '',
  viewMode = 'grid',
  emptyMessage,
}: SkillGridProps) {
  const filteredSkills = skills.filter((skill) => {
    if (filterCategory && skill.category !== filterCategory) return false
    if (filterLevel && skill.level !== filterLevel) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = skill.name.toLowerCase().includes(query)
      const matchesCategory = skill.category.toLowerCase().includes(query)
      const matchesTags = skill.tags?.some((tag) => tag.toLowerCase().includes(query))
      const matchesDescription = skill.description?.toLowerCase().includes(query)
      if (!matchesName && !matchesCategory && !matchesTags && !matchesDescription) return false
    }
    return true
  })

  if (filteredSkills.length === 0) {
    return (
      <div className="border-y border-line py-16">
        <p className="font-display text-3xl font-light">No skills here yet</p>
        <p className="mt-3 max-w-md text-ink-muted">
          {emptyMessage ??
            (filterCategory || filterLevel || searchQuery
              ? 'Nothing matches these filters. Clear them to see every skill.'
              : 'Add your first skill, then attach work that shows it.')}
        </p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="ruled-list border-y border-line">
        {filteredSkills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onEdit={onEdit}
            onDelete={onDelete}
            viewMode="list"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredSkills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onEdit={onEdit}
          onDelete={onDelete}
          viewMode="grid"
        />
      ))}
    </div>
  )
}
