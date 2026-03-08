'use client'

import React, { useState } from 'react'
import { Skill, SkillCategory, SkillLevel } from '@/lib/types'
import { useSkills } from '@/lib/hooks/useSkills'
import SkillGrid from '@/components/Skills/SkillGrid'
import SkillForm from '@/components/Skills/SkillForm'
import { Plus, Filter, X, Search, Download, Share2, Grid, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SKILL_CATEGORIES, SKILL_LEVELS } from '@/lib/utils/constants'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useToast } from '@/components/UI/ToastProvider'
import { easing } from '@/lib/utils/animations'

export default function SkillsPage() {
  const { skills, loading, addSkill, updateSkill, deleteSkill } = useSkills()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleSave = async (skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => {
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
    setEditingSkill(skill)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const skill = skills.find(s => s.id === id)
    if (window.confirm(`Are you sure you want to delete "${skill?.name || 'this skill'}"?`)) {
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

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = searchQuery === '' || skill.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === '' || skill.category === filterCategory
    const matchesLevel = filterLevel === '' || skill.level === filterLevel
    return matchesSearch && matchesCategory && matchesLevel
  })

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="page-shell">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-5 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: easing.primary }}
            className="flex-1"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-3 md:mb-4 tracking-tight leading-[1.1] max-w-[12ch] md:max-w-none">
              Skills
            </h1>
            <p className="text-base md:text-lg text-black/60 dark:text-white/60 max-w-[36ch] md:max-w-2xl">
              Manage and track your skill portfolio
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2, ease: easing.primary }}
            className="flex flex-wrap items-center gap-3"
          >
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
                setEditingSkill(null)
                setShowForm(true)
              }}
            >
              Add Skill
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: easing.primary }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 md:mb-8"
        >
          {['Track', 'Verify', 'Share'].map((item) => (
            <div key={item} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/45 px-4 py-3 text-sm text-black/70 dark:text-white/70 text-center">
              {item}
            </div>
          ))}
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-3 border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/55 backdrop-blur-[2px] text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
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
          <div className="flex items-center gap-2 border border-black/10 dark:border-white/10 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`min-h-[44px] min-w-[44px] p-2.5 transition-opacity ${
                viewMode === 'grid'
                  ? 'bg-black dark:bg-white text-white dark:text-black opacity-100'
                  : 'text-black/60 dark:text-white/60 hover:opacity-100 opacity-60'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`min-h-[44px] min-w-[44px] p-2.5 transition-opacity ${
                viewMode === 'list'
                  ? 'bg-black dark:bg-white text-white dark:text-black opacity-100'
                  : 'text-black/60 dark:text-white/60 hover:opacity-100 opacity-60'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-black/60 dark:text-white/60">
            <span className="font-medium text-black dark:text-white">{skills.length}</span> {skills.length === 1 ? 'skill' : 'skills'}
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
              className="mb-8 p-6 border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/50"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-black dark:text-white">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="min-h-[44px] px-2 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
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
                  <label className="block text-sm font-medium text-black dark:text-white mb-3 uppercase tracking-wider">
                    Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
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
      </div>
    </div>
  )
}
