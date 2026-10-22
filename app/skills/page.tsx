'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Grid, List } from 'lucide-react'
import { Skill, SkillCategory, User } from '@/lib/types'
import { useSkills } from '@/lib/hooks/useSkills'
import SkillGrid from '@/components/Skills/SkillGrid'
import SkillForm from '@/components/Skills/SkillForm'
import Modal from '@/components/UI/Modal'
import { SKILL_LEVELS } from '@/lib/utils/constants'
import Loader from '@/components/UI/Loader'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { authApi } from '@/lib/api'
import { SKILL_PILLAR_DETAILS } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'

export default function SkillsPage() {
  const { skills, loading, addSkill, updateSkill, deleteSkill } = useSkills()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
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
          title: 'Skill updated',
          message: `${skillData.name} has been updated.`,
        })
      } else {
        await addSkill(skillData)
        addToast({
          type: 'success',
          title: 'Skill added',
          message: `${skillData.name} is on your passport. Add proof to get it verified.`,
        })
      }
      setShowForm(false)
      setEditingSkill(null)
    } catch (error) {
      console.error('Failed to save skill:', error)
      addToast({
        type: 'error',
        title: 'Could not save',
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

  const startAdd = () => {
    if (isGuestPreview) {
      showGuestPreviewMessage()
      return
    }
    setEditingSkill(null)
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    try {
      await deleteSkill(id)
      addToast({
        type: 'success',
        title: 'Skill deleted',
        message: 'The skill has been removed from your passport.',
      })
    } catch (error) {
      console.error('Failed to delete skill:', error)
      addToast({
        type: 'error',
        title: 'Could not delete',
        message: 'Failed to delete skill. Please try again.',
      })
    }
  }

  if (loading) {
    return (
      <AppPageShell>
        <div className="page-shell">
          <Loader />
        </div>
      </AppPageShell>
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
  const verifiedCount = skills.filter((skill) => skill.verified).length
  const deletingName = skills.find((s) => s.id === deleteConfirmId)?.name ?? 'this skill'

  return (
    <AppPageShell>
      <div className="page-shell">
        {isGuestPreview && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-ink-muted">
              You are viewing sample skills. Adding and editing needs an account.
            </p>
            <Link href="/auth/register" className="pill" data-active="true">
              Create account
            </Link>
          </div>
        )}

        <PageHeader
          title="Skills"
          rule
          description={
            skills.length === 0
              ? 'Add the skills you have. Each one can be checked by the AI against work you attach.'
              : `${verifiedCount} of ${skills.length} verified. Employers see verified skills first; the rest show as claimed.`
          }
          actions={
            <>
              <Button onClick={startAdd} leftIcon={<Plus className="size-4" aria-hidden />}>
                Add a skill
              </Button>
              <Link href="/verification" className="button-base button-secondary min-h-11 px-5">
                Run a check
              </Link>
            </>
          }
        />

        <div className="flex flex-col gap-4 border-t border-line pt-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by pillar">
            <button
              type="button"
              className="pill"
              aria-pressed={filterCategory === ''}
              onClick={() => setFilterCategory('')}
            >
              All <span className="tabular opacity-60">{skills.length}</span>
            </button>
            {SKILL_PILLAR_DETAILS.map((pillar) => (
              <button
                key={pillar.category}
                type="button"
                className="pill"
                aria-pressed={filterCategory === pillar.category}
                onClick={() => setFilterCategory(pillar.category)}
              >
                {pillar.shortLabel}{' '}
                <span className="tabular opacity-60">{pillarCounts[pillar.category] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search skills</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search skills"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="metalab-input !min-h-9 w-56 !py-1.5 pl-9 text-sm"
              />
            </label>
            <label>
              <span className="sr-only">Level</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="metalab-input !min-h-9 w-auto !py-1.5 text-sm"
              >
                <option value="">All levels</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1" role="group" aria-label="Layout">
              <button
                type="button"
                className="pill size-9 justify-center p-0"
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="pill size-9 justify-center p-0"
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SkillGrid
            skills={filteredSkills}
            onEdit={handleEdit}
            onDelete={handleDelete}
            viewMode={viewMode}
            emptyMessage={
              skills.length > 0
                ? 'Nothing matches these filters. Clear them to see every skill.'
                : undefined
            }
          />
        </div>

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
          <p className="leading-relaxed text-ink-muted">
            Delete <span className="text-ink">{deletingName}</span> and its proof? This can’t be
            undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </AppPageShell>
  )
}
