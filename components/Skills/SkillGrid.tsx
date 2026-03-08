'use client'

import { Skill } from '@/lib/types'
import SkillCard from './SkillCard'
import { motion } from 'framer-motion'
import { Circle } from 'lucide-react'

interface SkillGridProps {
  skills: Skill[]
  onEdit: (skill: Skill) => void
  onDelete: (id: string) => void
  filterCategory?: string
  filterLevel?: string
  searchQuery?: string
  viewMode?: 'grid' | 'list'
}

export default function SkillGrid({
  skills,
  onEdit,
  onDelete,
  filterCategory,
  filterLevel,
  searchQuery = '',
  viewMode = 'grid',
}: SkillGridProps) {
  const filteredSkills = skills.filter((skill) => {
    if (filterCategory && skill.category !== filterCategory) return false
    if (filterLevel && skill.level !== filterLevel) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = skill.name.toLowerCase().includes(query)
      const matchesCategory = skill.category.toLowerCase().includes(query)
      const matchesTags = skill.tags?.some(tag => tag.toLowerCase().includes(query))
      const matchesDescription = skill.description?.toLowerCase().includes(query)
      if (!matchesName && !matchesCategory && !matchesTags && !matchesDescription) return false
    }
    return true
  })

  if (filteredSkills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center py-16 lg:py-24"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-900/50 border border-neutral-800/50 mb-6">
          <Circle className="w-10 h-10 text-neutral-600" />
        </div>
        <p className="text-xl font-semibold text-neutral-200 mb-2 tracking-tight">No skills found</p>
        <p className="text-neutral-400 font-light max-w-md mx-auto">
          {filterCategory || filterLevel
            ? 'Try adjusting your filters to see more results'
            : 'Add your first skill to get started building your passport'}
        </p>
      </motion.div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
