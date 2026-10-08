'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Skill, SkillCategory, User } from '@/lib/types'
import { useSkills } from '@/lib/hooks/useSkills'
import SkillGrid from '@/components/Skills/SkillGrid'
import SkillForm from '@/components/Skills/SkillForm'
import Modal from '@/components/UI/Modal'
import {
  Plus,
  Filter,
  Search,
  Grid,
  List,
  Code,
  Palette,
  MessageSquare,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_COLORS, SKILL_CATEGORIES, SKILL_LEVELS } from '@/lib/utils/constants'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'
import { authApi } from '@/lib/api'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'

const pillarIcons: Record<SkillCategory, React.ReactNode> = {
  'Technical Skills': <Code className="w-5 h-5" />,
  'Creative Skills': <Palette className="w-5 h-5" />,
  'Communication Skills': <MessageSquare className="w-5 h-5" />,
  'Professional Skills': <Briefcase className="w-5 h-5" />,
  'Learning & Growth': <TrendingUp className="w-5 h-5" />,
}

export default function SkillsPage() {
  const { skills, loading, addSkill, updateSkill, deleteSkill } = useSkills()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const isGuestPreview = user?.id === 'guest-user'

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const showGuestPreviewMessage = () => {
    addToast({
      type: 'info',
      title: 'Guest preview mode',
      message: 'Sign in or create an account to change your skills.',
    })
  }

  const handleSave = async (skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isGuestPreview) {
      showGuestPreviewMessage()
      return
    }
    try {
      if (editingSkill) {
        await updateSkill(editingSkill.id, skillData)
        addToast({
          type: 'success',
          title: 'Skill Updated',
          message: `${skillData.name} has been updated successfully.`,
        })
      } else {
        await addSkill(skillData)
        addToast({
          type: 'success',
          title: 'Skill Added',
          message: `${skillData.name} has been added to your passport.`,
        })
      }
      setShowForm(false)
      setEditingSkill(null)
    } catch (error) {
      console.error('Failed to save skill:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save skill. Please try again.',
      })
    }
  }

  const handleEdit = (skill: Skill) => {
    if (isGuestPreview) {
      showGuestPreviewMessage()
      return
    }
    setEditingSkill(skill)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (isGuestPreview) {
      showGuestPreviewMessage()
      return
    }
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    try {
      await deleteSkill(id)
      addToast({
        type: 'success',
        title: 'Skill Deleted',
        message: 'The skill has been removed from your passport.',
      })
    } catch (error) {
      console.error('Failed to delete skill:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete skill. Please try again.',
      })
    }
  }

  const clearFilters = () => {
    setFilterCategory('')
    setFilterLevel('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      searchQuery === '' || skill.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === '' || skill.category === filterCategory
    const matchesLevel = filterLevel === '' || skill.level === filterLevel
    return matchesSearch && matchesCategory && matchesLevel
  })

  const pillarCounts = skills.reduce(
    (acc, skill) => {
      acc[skill.category] = (acc[skill.category] ?? 0) + 1
      return acc
    },
    {} as Record<SkillCategory, number>
  )

  return (
    <AppPageShell className="min-h-screen bg-black">
      <div className="page-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: easing.primary }}
          className="mb-8 md:mb-12"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="hero-kicker mb-5">Skill Passport Studio</div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4 tracking-tight leading-[1.1] max-w-[12ch] md:max-w-none">
                  Skills
                </h1>
                <p className="text-base md:text-lg text-white/68 max-w-[36ch] md:max-w-2xl">
                  Turn scattered experience into a vivid skill passport organized around what you
                  build, create, explain, lead, and improve over time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Filter className="w-4 h-4" />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    if (isGuestPreview) {
                      showGuestPreviewMessage()
                      return
                    }
                    setEditingSkill(null)
                    setShowForm(true)
                  }}
                >
                  Add Skill
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-6">
              {[
                { label: 'Skills tracked', value: skills.length },
                {
                  label: 'Verified signals',
                  value: skills.filter((skill) => skill.verified).length,
                },
                {
                  label: 'Pillars represented',
                  value: new Set(skills.map((skill) => skill.category)).size,
                },
              ].map((item) => (
                <div key={item.label} className="insight-card px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {item.label}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: easing.primary }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-6 md:mb-8"
        >
          {SKILL_PILLAR_DETAILS.map((pillar) => {
            const color = CATEGORY_COLORS[pillar.category]
            return (
              <div
                key={pillar.category}
                className="insight-card px-4 py-4"
                style={{ borderColor: `${color}30`, boxShadow: `inset 0 0 0 1px ${color}15` }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {pillar.shortLabel}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-white">
                    {pillarIcons[pillar.category]}
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold text-white">{pillar.category}</div>
                <p className="mt-2 text-sm text-white/62">{pillar.summary}</p>
                <div className="mt-4 text-2xl font-semibold text-white">
                  {pillarCounts[pillar.category] ?? 0}
                </div>
              </div>
            )
          })}
        </motion.div>

        {isGuestPreview && (
          <div className="mb-6 border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
            You are browsing a guest preview. Sign in or create an account to add, edit, and delete
            skills.
          </div>
        )}

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-3 border border-white/10 bg-black/55 backdrop-blur-xl text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-300/60 transition-colors"
            />
          </div>
        </motion.div>

        {/* View Mode Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-between mb-6 md:mb-8"
        >
          <div className="flex items-center gap-2 border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`min-h-[44px] min-w-[44px] p-2.5 transition-opacity ${
                viewMode === 'grid'
                  ? 'bg-white text-black opacity-100'
                  : 'text-white/60 hover:opacity-100 opacity-60'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`min-h-[44px] min-w-[44px] p-2.5 transition-opacity ${
                viewMode === 'list'
                  ? 'bg-white text-black opacity-100'
                  : 'text-white/60 hover:opacity-100 opacity-60'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-white/60">
            <span className="font-medium text-white">{skills.length}</span>{' '}
            {skills.length === 1 ? 'skill' : 'skills'}
          </div>
        </motion.div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 insight-card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="min-h-[44px] px-2 text-sm text-white/55 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-3 block text-sm font-medium uppercase tracking-wider text-white">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-cyan-300/60 focus:outline-none transition-colors"
                  >
                    <option value="">All Categories</option>
                    {SKILL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium uppercase tracking-wider text-white">
                    Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-cyan-300/60 focus:outline-none transition-colors"
                  >
                    <option value="">All Levels</option>
                    {SKILL_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SkillGrid
          skills={filteredSkills}
          onEdit={handleEdit}
          onDelete={handleDelete}
          viewMode={viewMode}
        />

        {showForm && (
          <SkillForm
            skill={editingSkill}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false)
              setEditingSkill(null)
            }}
          />
        )}

        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete skill"
          size="sm"
        >
          <div className="space-y-5">
            <p className="text-sm text-white/60 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">
                {skills.find((s) => s.id === deleteConfirmId)?.name ?? 'this skill'}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/65 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppPageShell>
  )
}
