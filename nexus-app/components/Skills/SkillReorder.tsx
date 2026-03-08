'use client'

import { Skill } from '@/lib/types'
import { motion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { useState } from 'react'

interface SkillReorderProps {
  skills: Skill[]
  onReorder: (skillIds: string[]) => void
}

export default function SkillReorder({ skills, onReorder }: SkillReorderProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [items, setItems] = useState(skills)

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null) return

    const newItems = [...items]
    const draggedSkill = newItems[draggedItem]

    newItems.splice(draggedItem, 1)
    newItems.splice(index, 0, draggedSkill)

    setItems(newItems)
    setDraggedItem(index)
  }

  const handleDragEnd = () => {
    if (draggedItem === null) return
    
    const skillIds = items.map(skill => skill.id)
    onReorder(skillIds)
    setDraggedItem(null)
  }

  return (
    <div className="space-y-2">
      {items.map((skill, index) => (
        <motion.div
          key={skill.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          whileDrag={{ opacity: 0.5, scale: 0.95 }}
          className="flex items-center gap-4 p-4 border border-black/10 dark:border-white/10 bg-white dark:bg-black cursor-move hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          <GripVertical className="w-5 h-5 text-black/40 dark:text-white/40" />
          <span className="flex-1 font-medium text-black dark:text-white">{skill.name}</span>
          <span className="text-sm text-black/60 dark:text-white/60">{index + 1}</span>
        </motion.div>
      ))}
    </div>
  )
}
