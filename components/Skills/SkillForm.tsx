'use client'

import { useState, useEffect, useId, useRef } from 'react'
import { Skill, SkillLevel, SkillCategory } from '@/lib/types'
import { SKILL_LEVELS, SKILL_CATEGORIES } from '@/lib/utils/constants'
import { X } from 'lucide-react'
import Link from 'next/link'

interface SkillFormProps {
  skill?: Skill | null
  onSave: (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

export default function SkillForm({ skill, onSave, onCancel }: SkillFormProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'intermediate' as SkillLevel,
    category: 'Technical Skills' as SkillCategory,
    progress: 50,
    notes: '',
    description: '',
    tags: [] as string[],
    verified: false,
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (skill) {
      setFormData({
        name: skill.name,
        level: skill.level,
        category: skill.category,
        progress: skill.progress,
        notes: skill.notes || '',
        description: skill.description || '',
        tags: skill.tags || [],
        verified: skill.verified || false,
      })
    }
  }, [skill])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    document.body.style.overflow = 'hidden'
    window.setTimeout(() => dialogRef.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ground/70 p-4 backdrop-blur-sm">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-raised outline-none"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-raised px-6 py-4">
            <h2 id={titleId} className="text-xl font-medium">
              {skill ? 'Edit skill' : 'Add a skill'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="pill size-9 justify-center p-0"
              aria-label="Close skill form"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="skill-name" className="metalab-label">
                Skill Name *
              </label>
              <input
                id="skill-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="metalab-input"
                placeholder="e.g., React Development"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="skill-category" className="metalab-label">
                  Category *
                </label>
                <select
                  id="skill-category"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as SkillCategory })
                  }
                  className="metalab-input"
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="skill-level" className="metalab-label">
                  Level *
                </label>
                <select
                  id="skill-level"
                  required
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value as SkillLevel })
                  }
                  className="metalab-input"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="skill-progress" className="metalab-label">
                Progress: {formData.progress}%
              </label>
              <input
                id="skill-progress"
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                className="w-full accent-verified"
              />
            </div>

            <div>
              <label htmlFor="skill-description" className="metalab-label">
                Description
              </label>
              <textarea
                id="skill-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="metalab-input"
                placeholder="Describe your skill and experience..."
              />
            </div>

            <div>
              <label htmlFor="skill-notes" className="metalab-label">
                Notes
              </label>
              <textarea
                id="skill-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="metalab-input"
                placeholder="Additional notes or achievements..."
              />
            </div>

            <div>
              <label htmlFor="skill-tags" className="metalab-label">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="skill-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className="metalab-input flex-1"
                  placeholder="Add a tag and press Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="button-base button-secondary min-h-[42px] px-4"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-pill px-3 py-1 text-sm text-ink"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full p-0.5 text-ink-faint hover:bg-pill-hover hover:text-ink"
                        aria-label={`Remove ${tag} tag`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Verification is set only by the AI check on submitted evidence. */}
            <p className="text-sm text-ink-muted">
              {formData.verified ? (
                <>
                  <span className="text-verified-ink">Verified.</span> Changing the name, level or
                  category removes the badge until the new claim is checked.
                </>
              ) : (
                <>
                  Not verified yet.{' '}
                  <Link
                    href="/verification"
                    className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                  >
                    Add evidence
                  </Link>{' '}
                  to have it checked.
                </>
              )}
            </p>

            <div className="flex gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={onCancel}
                className="button-base button-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" className="button-base button-primary flex-1">
                {skill ? 'Update Skill' : 'Add Skill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
