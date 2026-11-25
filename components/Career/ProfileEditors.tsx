'use client'

import { useState } from 'react'
import {
  AVAILABILITY,
  CAREER_INTERESTS,
  EMPLOYMENT_STATUSES,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  WORK_ARRANGEMENTS,
} from '@/lib/career/profile-options'
import type { ProfileFields } from './useCareerProfile'

type Props = { value: ProfileFields; onChange: (patch: Partial<ProfileFields>) => void }

function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function Pills({
  options,
  selected,
  onToggle,
  label,
}: {
  options: readonly { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="pill"
          aria-pressed={selected.includes(o.id)}
          onClick={() => onToggle(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A comma/enter-separated list of free text, like job titles or cities. */
function TagInput({
  values,
  onChange,
  placeholder,
  max,
  label,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  max: number
  label: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v) && values.length < max) onChange([...values, v])
    setDraft('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          aria-label={label}
          className="metalab-input"
          value={draft}
          maxLength={120}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="button-base button-secondary px-4" onClick={add}>
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                className="pill"
                data-active="true"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                {v} ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Block({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

export function BasicsEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-8">
      <Block title="Where are you right now?" hint="Optional.">
        <Pills
          label="Employment status"
          options={EMPLOYMENT_STATUSES}
          selected={value.employmentStatus ? [value.employmentStatus] : []}
          onToggle={(id) =>
            onChange({ employmentStatus: value.employmentStatus === id ? null : id })
          }
        />
      </Block>
      <Block title="Are you in school now?" hint="Optional.">
        <Pills
          label="Currently a student"
          options={YES_NO}
          selected={value.currentlyStudent == null ? [] : [value.currentlyStudent ? 'yes' : 'no']}
          onToggle={(id) => onChange({ currentlyStudent: id === 'yes' })}
        />
      </Block>
      <Block
        title="Years of relevant experience"
        hint="Optional. Count internships and freelance work too."
      >
        <input
          type="number"
          min={0}
          max={60}
          className="metalab-input w-32"
          value={value.yearsExperience ?? ''}
          onChange={(e) =>
            onChange({
              yearsExperience:
                e.target.value === '' ? null : Math.max(0, Math.min(60, Number(e.target.value))),
            })
          }
        />
      </Block>
    </div>
  )
}

export function InterestsEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-8">
      <Block title="Which areas interest you?" hint="Pick as many as you like.">
        <Pills
          label="Career interests"
          options={CAREER_INTERESTS.map((i) => ({ id: i, label: i }))}
          selected={value.interests}
          onToggle={(id) => onChange({ interests: toggle(value.interests, id) })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.exploring}
            onChange={(e) => onChange({ exploring: e.target.checked })}
          />
          I&apos;m still exploring and not sure yet
        </label>
      </Block>
      <Block title="Job titles you want" hint="For example: Data Analyst, Junior Developer.">
        <TagInput
          label="Desired job titles"
          values={value.desiredTitles}
          onChange={(v) => onChange({ desiredTitles: v })}
          placeholder="Type a title and press Enter"
          max={10}
        />
      </Block>
      <Block title="Target career" hint="The main role you're working toward. Optional.">
        <input
          className="metalab-input"
          maxLength={120}
          value={value.targetCareer ?? ''}
          onChange={(e) => onChange({ targetCareer: e.target.value })}
        />
      </Block>
      <Block title="Long-term goal" hint="Where you'd like to be in a few years. Optional.">
        <textarea
          className="metalab-input min-h-24 py-3"
          maxLength={600}
          value={value.longTermGoal ?? ''}
          onChange={(e) => onChange({ longTermGoal: e.target.value })}
        />
      </Block>
    </div>
  )
}

export function PreferencesEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-8">
      <Block title="Where do you want to work?" hint="Cities, states or countries.">
        <TagInput
          label="Preferred locations"
          values={value.locations}
          onChange={(v) => onChange({ locations: v })}
          placeholder="e.g. Austin, TX"
          max={10}
        />
      </Block>
      <Block title="Work arrangement">
        <Pills
          label="Work arrangement"
          options={WORK_ARRANGEMENTS}
          selected={value.workArrangements}
          onToggle={(id) => onChange({ workArrangements: toggle(value.workArrangements, id) })}
        />
      </Block>
      <Block title="Job type">
        <Pills
          label="Job type"
          options={JOB_TYPES}
          selected={value.jobTypes}
          onToggle={(id) => onChange({ jobTypes: toggle(value.jobTypes, id) })}
        />
      </Block>
      <Block title="Level">
        <Pills
          label="Experience level"
          options={EXPERIENCE_LEVELS}
          selected={value.experienceLevels}
          onToggle={(id) => onChange({ experienceLevels: toggle(value.experienceLevels, id) })}
        />
      </Block>
      <Block title="Salary range (USD per year)" hint="Optional.">
        <div className="flex items-center gap-2">
          {(['salaryMin', 'salaryMax'] as const).map((k, i) => (
            <span key={k} className="flex items-center gap-2">
              {i === 1 && <span className="text-ink-faint">to</span>}
              <input
                type="number"
                min={0}
                step={1000}
                aria-label={i === 0 ? 'Lowest salary' : 'Highest salary'}
                className="metalab-input w-36"
                value={value[k] ?? ''}
                onChange={(e) =>
                  onChange({ [k]: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </span>
          ))}
        </div>
      </Block>
      <Block title="Willing to relocate?" hint="Optional.">
        <Pills
          label="Willing to relocate"
          options={YES_NO}
          selected={value.willingToRelocate == null ? [] : [value.willingToRelocate ? 'yes' : 'no']}
          onToggle={(id) => onChange({ willingToRelocate: id === 'yes' })}
        />
      </Block>
      <Block title="When can you start?" hint="Optional.">
        <Pills
          label="Availability"
          options={AVAILABILITY}
          selected={value.availability ? [value.availability] : []}
          onToggle={(id) => onChange({ availability: value.availability === id ? null : id })}
        />
      </Block>
    </div>
  )
}
