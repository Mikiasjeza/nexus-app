'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import {
  normalizeSkillName,
  SKILL_PILLAR_DETAILS,
  SKILL_SUGGESTION_GROUPS,
} from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'

const steps = [
  {
    id: 1,
    title: 'Welcome',
    heading: 'Welcome to Nexus',
    body: 'Your skills sit in five pillars. Add what you can do, attach work that shows it, and the AI checks it against the level you claim.',
  },
  {
    id: 2,
    title: 'Goals',
    heading: 'What are you here for?',
    body: 'Optional. Pick any that apply; it shapes what your dashboard suggests first.',
  },
  {
    id: 3,
    title: 'Skills',
    heading: 'Add a few skills',
    body: 'Pick from the suggestions or add your own. You can change these any time.',
  },
  {
    id: 4,
    title: 'Done',
    heading: 'You’re set',
    body: 'Your passport is ready. Next, attach proof to a skill and run your first check.',
  },
]

const goals = [
  { id: 'career', title: 'Grow in my field', description: 'Show progress where I already work.' },
  { id: 'job-search', title: 'Find a new job', description: 'Get matched with open roles.' },
  {
    id: 'skill-verification',
    title: 'Verify my skills',
    description: 'Turn claims into checked proof.',
  },
  { id: 'learning', title: 'Track my learning', description: 'See new skills take shape.' },
]

const MAX_ONBOARDING_SKILLS = 15

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [customSkillError, setCustomSkillError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }

  const handleSkillToggle = (skill: string) => {
    const normalizedSkill = normalizeSkillName(skill)
    setCustomSkillError(null)
    setSelectedSkills((prev) => {
      const hasSkill = prev.some(
        (existing) => existing.toLowerCase() === normalizedSkill.toLowerCase()
      )

      if (hasSkill) {
        return prev.filter((existing) => existing.toLowerCase() !== normalizedSkill.toLowerCase())
      }

      if (prev.length >= MAX_ONBOARDING_SKILLS) {
        setCustomSkillError(`Choose up to ${MAX_ONBOARDING_SKILLS} skills for now.`)
        return prev
      }

      return [...prev, normalizedSkill]
    })
  }

  const handleCustomSkillAdd = () => {
    const normalizedSkill = normalizeSkillName(customSkill)

    if (!normalizedSkill) {
      setCustomSkillError('Type a skill name first.')
      return
    }

    if (normalizedSkill.length < 2) {
      setCustomSkillError('Skill names should be at least 2 characters.')
      return
    }

    if (selectedSkills.some((skill) => skill.toLowerCase() === normalizedSkill.toLowerCase())) {
      setCustomSkillError('That skill is already selected.')
      return
    }

    if (selectedSkills.length >= MAX_ONBOARDING_SKILLS) {
      setCustomSkillError(`Choose up to ${MAX_ONBOARDING_SKILLS} skills for now.`)
      return
    }

    setSelectedSkills((prev) => [...prev, normalizedSkill])
    setCustomSkill('')
    setCustomSkillError(null)
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      setIsCompleting(true)
      setCompletionError(null)

      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ goals: selectedGoals, skills: selectedSkills }),
      })

      if (response.status === 401) {
        router.replace('/auth/login?next=/onboarding')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'We could not finish onboarding. Please try again.'
        )
      }

      addToast({
        type: 'success',
        title: 'Welcome to Nexus!',
        message: 'Your passport is ready.',
      })

      router.replace('/dashboard')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not finish onboarding. Please try again.'
      setCompletionError(message)
      addToast({
        type: 'error',
        title: 'Onboarding could not finish',
        message,
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // Goals and skills are optional: never block someone from reaching the app.
  const isSkippableEmptyStep =
    (currentStep === 2 && selectedGoals.length === 0) ||
    (currentStep === 3 && selectedSkills.length === 0)
  const step = steps[currentStep - 1]

  return (
    <AppPageShell>
      <div className="page-shell max-w-[64rem]">
        <div className="flex items-center gap-4 text-sm text-ink-faint">
          <span className="tabular">
            {currentStep} / {steps.length}
          </span>
          <div className="h-px flex-1 bg-line" aria-hidden>
            <div
              className="h-px bg-ink transition-[width] duration-200 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          <span>{step.title}</span>
        </div>

        <section aria-labelledby="onboarding-step" className="py-12">
          <h1 id="onboarding-step" className="page-title">
            {step.heading}
            <span className="title-rule" aria-hidden />
          </h1>
          <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-ink-muted">{step.body}</p>

          {currentStep === 1 && (
            <ul className="ruled-list mt-12 border-y border-line">
              {SKILL_PILLAR_DETAILS.map((pillar) => (
                <li
                  key={pillar.category}
                  className="grid grid-cols-[6rem_minmax(0,1fr)] gap-6 py-5"
                >
                  <span className="font-medium">{pillar.shortLabel}</span>
                  <span className="text-ink-muted">{pillar.summary}</span>
                </li>
              ))}
            </ul>
          )}

          {currentStep === 2 && (
            <div className="mt-12 grid gap-2 sm:grid-cols-2" role="group" aria-label="Goals">
              {goals.map((goal) => {
                const selected = selectedGoals.includes(goal.id)
                return (
                  <button
                    key={goal.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleGoalToggle(goal.id)}
                    className={`rounded-2xl border p-6 text-left transition-colors duration-150 ${
                      selected
                        ? 'border-verified bg-verified-wash'
                        : 'border-line hover:border-line-strong'
                    }`}
                  >
                    <span className="block font-display text-[1.75rem] font-light leading-tight">
                      {goal.title}
                    </span>
                    <span className="mt-2 block text-sm text-ink-muted">{goal.description}</span>
                  </button>
                )
              })}
            </div>
          )}

          {currentStep === 3 && (
            <div className="mt-12">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleCustomSkillAdd()
                }}
              >
                <label className="flex-1">
                  <span className="sr-only">Add your own skill</span>
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(event) => {
                      setCustomSkill(event.target.value)
                      if (customSkillError) setCustomSkillError(null)
                    }}
                    className="metalab-input"
                    placeholder="Add your own, like Salesforce, C++ or recruiting"
                    aria-describedby={customSkillError ? 'custom-skill-error' : undefined}
                  />
                </label>
                <Button type="submit" variant="secondary">
                  Add
                </Button>
              </form>
              {customSkillError && (
                <p id="custom-skill-error" className="mt-2 text-sm text-critical">
                  {customSkillError}
                </p>
              )}

              {selectedSkills.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-ink-faint">
                    Selected {selectedSkills.length} of {MAX_ONBOARDING_SKILLS}. Tap one to remove
                    it.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <li key={skill}>
                        <button
                          type="button"
                          className="pill"
                          data-active="true"
                          onClick={() => handleSkillToggle(skill)}
                          aria-label={`Remove ${skill}`}
                        >
                          {skill} ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="ruled-list mt-10 border-y border-line">
                {SKILL_SUGGESTION_GROUPS.map((group) => (
                  <li
                    key={group.id}
                    className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8"
                  >
                    <div>
                      <p className="font-medium">{group.label}</p>
                      <p className="mt-1 text-sm text-ink-muted">{group.description}</p>
                    </div>
                    <div
                      className="flex flex-wrap content-start gap-2"
                      role="group"
                      aria-label={group.label}
                    >
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.some(
                          (selected) => selected.toLowerCase() === skill.toLowerCase()
                        )
                        return (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleSkillToggle(skill)}
                            className="pill"
                          >
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mt-12">
              {completionError && (
                <p role="alert" className="mb-6 text-sm text-critical">
                  {completionError}
                </p>
              )}
              <ul className="ruled-list border-y border-line">
                <li className="flex justify-between gap-4 py-4">
                  <span className="text-ink-muted">Goals</span>
                  <span>
                    {selectedGoals.length
                      ? goals
                          .filter((goal) => selectedGoals.includes(goal.id))
                          .map((goal) => goal.title)
                          .join(', ')
                      : 'None yet'}
                  </span>
                </li>
                <li className="flex justify-between gap-4 py-4">
                  <span className="text-ink-muted">Skills to add</span>
                  <span>{selectedSkills.length || 'None yet'}</span>
                </li>
                <li className="flex justify-between gap-4 py-4">
                  <span className="text-ink-muted">Next</span>
                  <span>Attach proof and run your first check</span>
                </li>
              </ul>
            </div>
          )}
        </section>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="size-4" aria-hidden />}
            onClick={handleBack}
            disabled={currentStep === 1 || isCompleting}
          >
            Back
          </Button>
          <Button
            rightIcon={
              currentStep === steps.length ? undefined : (
                <ArrowRight className="size-4" aria-hidden />
              )
            }
            onClick={handleNext}
            isLoading={isCompleting}
            disabled={isCompleting}
          >
            {currentStep === steps.length
              ? 'Go to my dashboard'
              : isSkippableEmptyStep
                ? 'Skip for now'
                : 'Next'}
          </Button>
        </div>
      </div>
    </AppPageShell>
  )
}
