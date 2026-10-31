'use client'

import { memo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Edit2, Trash2 } from 'lucide-react'
import { Skill } from '@/lib/types'
import { LEVEL_LABELS } from '@/lib/utils/constants'
import { getSkillPillarDetail, normalizeSkillCategory } from '@/lib/skills-taxonomy'

interface SkillCardProps {
  skill: Skill
  onEdit: (skill: Skill) => void
  onDelete: (id: string) => void
  viewMode?: 'grid' | 'list'
}

function Status({ verified }: { verified?: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-2 text-sm text-verified">
      <span className="size-1.5 rounded-full bg-verified" aria-hidden />
      Verified
    </span>
  ) : (
    <span className="text-sm text-ink-faint">Not verified yet</span>
  )
}

function Actions({ skill, onEdit, onDelete }: Omit<SkillCardProps, 'viewMode'>) {
  return (
    <div className="flex items-center gap-1.5 md:justify-end">
      <Link href={`/verification?skill=${skill.id}`} className="pill">
        {skill.verified ? 'Check again' : 'Check'}
      </Link>
      <button
        type="button"
        onClick={() => onEdit(skill)}
        className="pill size-8 justify-center p-0"
        aria-label={`Edit ${skill.name}`}
      >
        <Edit2 className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onDelete(skill.id)}
        className="pill size-8 justify-center p-0 hover:!bg-critical/15 hover:text-critical"
        aria-label={`Delete ${skill.name}`}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

/** One skill: a ruled row in the list view, a raised card in the grid view. */
function SkillCard({ skill, onEdit, onDelete, viewMode = 'grid' }: SkillCardProps) {
  const pillar = getSkillPillarDetail(normalizeSkillCategory(skill.category)).shortLabel
  const level = LEVEL_LABELS[skill.level] ?? skill.level
  const evidenceCount = skill.evidence?.length ?? 0

  if (viewMode === 'list') {
    return (
      <div className="grid items-center gap-x-6 gap-y-3 py-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_12.5rem]">
        <div className="min-w-0">
          <p className="truncate font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-light leading-tight">
            {skill.name}
          </p>
          {skill.description && (
            <p className="mt-1 line-clamp-1 text-sm text-ink-faint">{skill.description}</p>
          )}
        </div>
        <span className="text-ink-muted">{pillar}</span>
        <span className="text-ink-muted">{level}</span>
        <Status verified={skill.verified} />
        <Actions skill={skill} onEdit={onEdit} onDelete={onDelete} />
      </div>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-raised p-6 transition-colors duration-150 hover:border-line-strong">
      <p className="flex items-center justify-between gap-3 text-sm text-ink-faint">
        <span>
          {pillar} · {level}
        </span>
        <Status verified={skill.verified} />
      </p>
      <div className="flex-1">
        <h3 className="mt-6 font-display text-[2rem] font-light leading-tight">{skill.name}</h3>
        {skill.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {skill.description}
          </p>
        )}
        {skill.tags && skill.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {skill.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-pill px-2.5 py-0.5 text-xs text-ink-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-faint">
          {evidenceCount > 0
            ? `${evidenceCount} ${evidenceCount === 1 ? 'piece' : 'pieces'} of proof · `
            : ''}
          Updated {format(new Date(skill.updatedAt), 'MMM d, yyyy')}
        </p>
        <Actions skill={skill} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  )
}

export default memo(SkillCard)
