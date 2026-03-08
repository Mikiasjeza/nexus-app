'use client'

import { Skill } from '@/lib/types'
import { LEVEL_COLORS, LEVEL_LABELS, CATEGORY_COLORS } from '@/lib/utils/constants'
import { motion } from 'framer-motion'
import { Edit2, Trash2, CheckCircle2, Circle, TrendingUp } from 'lucide-react'
import ProgressBar from '../UI/ProgressBar'
import AnimatedCard from '../UI/AnimatedCard'
import { format } from 'date-fns'
import { skillGrowth, easing } from '@/lib/utils/animations'
import { useMemo, memo } from 'react'

interface SkillCardProps {
  skill: Skill
  onEdit: (skill: Skill) => void
  onDelete: (id: string) => void
  viewMode?: 'grid' | 'list'
}

function SkillCard({ skill, onEdit, onDelete, viewMode = 'grid' }: SkillCardProps) {
  const levelColor = LEVEL_COLORS[skill.level] || '#64748b'
  const categoryColor = CATEGORY_COLORS[skill.category] || '#64748b'

  // Memoize style objects to prevent React style issues
  const iconStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${levelColor}, ${levelColor}dd)`,
    backgroundColor: levelColor,
  }), [levelColor])

  const categoryBadgeStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${categoryColor}20, ${categoryColor}10)`,
    color: categoryColor,
    borderColor: `${categoryColor}30`,
  }), [categoryColor])

  const levelBadgeStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${levelColor}20, ${levelColor}10)`,
    color: levelColor,
    borderColor: `${levelColor}30`,
  }), [levelColor])

  const hoverGradientStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${levelColor}10, ${categoryColor}10)`,
  }), [levelColor, categoryColor])

  // Determine if skill has grown (progress increased) - for state-change animation
  const hasGrown = useMemo(() => {
    if (!skill.history || skill.history.length === 0) return false
    const recent = skill.history[skill.history.length - 1]
    const progressChange = recent?.changes?.find((c: { field: string }) => c.field === 'progress')
    return progressChange && Number(progressChange.newValue) > Number(progressChange.oldValue)
  }, [skill.history])

  if (viewMode === 'list') {
    return (
      <AnimatedCard className="p-6 lg:p-8 group hover:border-neutral-700/50">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.3 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg relative overflow-hidden flex-shrink-0"
              style={iconStyle}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <span className="relative z-10">{skill.name.charAt(0)}</span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h3 className="text-xl font-bold text-neutral-100 group-hover:text-white transition-colors tracking-tight">{skill.name}</h3>
                {skill.verified && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="p-1 rounded-full bg-primary-500/20 border border-primary-500/30"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary-400" />
                  </motion.div>
                )}
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-sm"
                  style={categoryBadgeStyle}
                >
                  {skill.category}
                </span>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
                  style={levelBadgeStyle}
                >
                  {LEVEL_LABELS[skill.level]}
                </span>
              </div>
              {skill.description && (
                <p className="text-sm text-neutral-400 mb-4 line-clamp-1 font-light leading-relaxed">{skill.description}</p>
              )}
              <div className="flex items-center gap-6">
                <ProgressBar progress={skill.progress} level={skill.level} className="flex-1 max-w-xs" />
                <span className="text-sm font-bold text-neutral-200 tabular-nums min-w-[3rem]">{skill.progress}%</span>
                <span className="text-xs text-neutral-500 font-light hidden sm:inline">Updated {format(new Date(skill.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEdit(skill)}
              className="p-2.5 text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-xl transition-premium border border-transparent hover:border-primary-500/20"
              aria-label="Edit skill"
            >
              <Edit2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(skill.id)}
              className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-premium border border-transparent hover:border-red-500/20"
              aria-label="Delete skill"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.5, ease: easing.primary } }}
      className="h-full"
    >
      <AnimatedCard className="p-6 lg:p-8 group hover:border-neutral-700/50 relative overflow-hidden h-full">
        {/* Subtle gradient background on hover - like digital credential */}
        <div 
          className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500"
          style={hoverGradientStyle}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                {/* Icon with subtle lift on hover */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ duration: 0.3 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg relative overflow-hidden flex-shrink-0"
                  style={iconStyle}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  <span className="relative z-10">{skill.name.charAt(0)}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-white transition-colors tracking-tight">{skill.name}</h3>
                    {skill.verified && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="p-1 rounded-full bg-primary-500/20 border border-primary-500/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-sm"
                      style={categoryBadgeStyle}
                    >
                      {skill.category}
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
                      style={levelBadgeStyle}
                    >
                      {LEVEL_LABELS[skill.level]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit(skill)}
                className="p-2 text-neutral-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-xl transition-premium border border-transparent hover:border-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Edit skill"
              >
                <Edit2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete(skill.id)}
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-premium border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete skill"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Progress bar - animates smoothly, shows growth */}
          <motion.div
            className="mb-6 relative"
            {...(hasGrown ? skillGrowth : {})}
          >
            <ProgressBar progress={skill.progress} level={skill.level} />
          </motion.div>

          {skill.description && (
            <p className="text-sm text-neutral-400 mb-4 line-clamp-2 font-light leading-relaxed">{skill.description}</p>
          )}

          {skill.notes && (
            <div className="mb-4 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 backdrop-blur-sm">
              <p className="text-xs text-neutral-400 font-light leading-relaxed">{skill.notes}</p>
            </div>
          )}

          {skill.tags && skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-neutral-900/50 text-neutral-400 text-xs rounded-lg border border-neutral-800/50 backdrop-blur-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {skill.evidence && skill.evidence.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 border border-primary-500/20 backdrop-blur-sm">
              <p className="text-xs font-semibold text-primary-300 mb-2 uppercase tracking-wider">Evidence</p>
              <div className="flex flex-wrap gap-2">
                {skill.evidence.map((ev, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-primary-500/20 text-primary-300 text-xs rounded-lg border border-primary-500/30 font-medium"
                  >
                    {ev.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-800/50">
            <span className="font-light">Updated {format(new Date(skill.updatedAt), 'MMM d, yyyy')}</span>
            {skill.progress > 70 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="flex items-center gap-1.5 text-green-400"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-semibold">Growing</span>
              </motion.div>
            )}
          </div>
        </div>
      </AnimatedCard>
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(SkillCard)
