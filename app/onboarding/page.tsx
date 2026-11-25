'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'
import { useToast } from '@/components/UI/ToastProvider'
import { normalizeSkillName, SKILL_SUGGESTION_GROUPS } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import {
  CertificationEditor,
  EducationEditor,
  ExperienceEditor,
} from '@/components/Career/RecordEditors'
import {
  BasicsEditor,
  InterestsEditor,
  PreferencesEditor,
} from '@/components/Career/ProfileEditors'
import CareerProfileSummary from '@/components/Career/CareerProfileSummary'
import {
  EMPTY_PROFILE,
  useCareerProfile,
  type ProfileFields,
} from '@/components/Career/useCareerProfile'

const steps = [
  {
    title: 'Education',
    heading: 'Your education',
    body: 'Tell us what you have finished and what you are working on now. Everything here is optional and private.',
  },
  {
    title: 'Experience',
    heading: 'Your experience',
    body: 'Jobs, internships, apprenticeships, freelance and volunteer work all count. Add as many as you like, or skip.',
  },
  {
    title: 'Interests',
    heading: 'What you want to do',
    body: 'Pick the areas and roles that interest you. It is fine to still be exploring.',
  },
  {
    title: 'Preferences',
    heading: 'The jobs you want',
    body: 'Where, how and what kind of work. You can change these any time in Settings.',
  },
  {
    title: 'Skills',
    heading: 'Your skills',
    body: 'Pick from the catalog or add your own. They start as Self-reported and become Verified only when you pass a Nexus assessment or evidence check.',
  },
  {
    title: 'Your profile',
    heading: 'Your Career Profile',
    body: 'Here is what we have so far, with assessments to take and jobs that fit. Everything stays private unless you choose to share it.',
  },
]

const MAX_ONBOARDING_SKILLS = 15

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const career = useCareerProfile()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [customSkillError, setCustomSkillError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const restored = useRef(false)

  // Pick up where they left off.
  useEffect(() => {
    if (restored.current || !career.data) return
    restored.current = true
    if (career.data.profile) {
      setProfile({ ...EMPTY_PROFILE, ...career.data.profile })
      setStep(Math.min(career.data.profile.onboardingStep, steps.length - 1))
    }
  }, [career.data])

  const patch = (p: Partial<ProfileFields>) => setProfile((cur) => ({ ...cur, ...p }))

  const handleSkillToggle = (skill: string) => {
    const name = normalizeSkillName(skill)
    setCustomSkillError(null)
    setSelectedSkills((prev) => {
      if (prev.some((s) => s.toLowerCase() === name.toLowerCase())) {
        return prev.filter((s) => s.toLowerCase() !== name.toLowerCase())
      }
      if (prev.length >= MAX_ONBOARDING_SKILLS) {
        setCustomSkillError(`Choose up to ${MAX_ONBOARDING_SKILLS} skills for now.`)
        return prev
      }
      return [...prev, name]
    })
  }

  const handleCustomSkillAdd = () => {
    const name = normalizeSkillName(customSkill)
    if (!name || name.length < 2) {
      setCustomSkillError('Type a skill name first.')
      return
    }
    if (selectedSkills.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setCustomSkillError('That skill is already selected.')
      return
    }
    if (selectedSkills.length >= MAX_ONBOARDING_SKILLS) {
      setCustomSkillError(`Choose up to ${MAX_ONBOARDING_SKILLS} skills for now.`)
      return
    }
    setSelectedSkills((prev) => [...prev, name])
    setCustomSkill('')
  }

  const postOnboarding = async (complete: boolean) => {
    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ skills: complete ? [] : selectedSkills, complete }),
    })
    if (res.status === 401) {
      router.replace('/auth/login?next=/onboarding')
      return false
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(typeof data?.error === 'string' ? data.error : 'Please try again.')
    }
    return true
  }

  const goTo = async (next: number) => {
    setBusy(true)
    setError(null)
    try {
      // Save this step's answers and where they are, so leaving keeps progress.
      await career.saveProfile({ ...profile, onboardingStep: next })
      if (step === 4 && next === 5 && selectedSkills.length > 0) {
        if (!(await postOnboarding(false))) return
        setSelectedSkills([])
        await career.reload()
      }
      setStep(next)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!(await postOnboarding(true))) return
      addToast({
        type: 'success',
        title: 'Welcome to Nexus!',
        message: 'Your Career Profile is ready.',
      })
      router.replace('/dashboard')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Please try again.'
      setError(message)
      addToast({ type: 'error', title: 'Onboarding could not finish', message })
    } finally {
      setBusy(false)
    }
  }

  if (!career.data) {
    return (
      <AppPageShell>
        <div className="page-shell max-w-[64rem]">
          {career.error ? <p className="text-critical">{career.error}</p> : <Loader />}
        </div>
      </AppPageShell>
    )
  }

  const data = career.data
  const current = steps[step]
  const isLast = step === steps.length - 1
  const records = (kind: string) => ({
    onAdd: (b: unknown) => career.addRecord(kind, b),
    onUpdate: (id: string, b: unknown) => career.updateRecord(kind, id, b),
    onDelete: (id: string) => career.deleteRecord(kind, id),
  })

  return (
    <AppPageShell>
      <div className="page-shell max-w-[64rem]">
        <div className="flex items-center gap-4 text-sm text-ink-faint">
          <span className="tabular">
            {step + 1} / {steps.length}
          </span>
          <div className="h-px flex-1 bg-line" aria-hidden>
            <div
              className="h-px bg-ink transition-[width] duration-200 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span>{current.title}</span>
        </div>

        <section aria-labelledby="onboarding-step" className="py-12">
          <h1 id="onboarding-step" className="page-title">
            {current.heading}
            <span className="title-rule" aria-hidden />
          </h1>
          <p className="mt-6 max-w-[40rem] text-lg leading-relaxed text-ink-muted">
            {current.body}
          </p>

          <div className="mt-12 space-y-12">
            {step === 0 && (
              <>
                <BasicsEditor value={profile} onChange={patch} />
                <div className="space-y-4">
                  <h2 className="text-base font-medium">Degrees and schooling</h2>
                  <EducationEditor rows={data.education} {...records('education')} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-base font-medium">Certifications and licenses</h2>
                  <CertificationEditor rows={data.certifications} {...records('certifications')} />
                </div>
              </>
            )}

            {step === 1 && <ExperienceEditor rows={data.experience} {...records('experience')} />}

            {step === 2 && <InterestsEditor value={profile} onChange={patch} />}

            {step === 3 && <PreferencesEditor value={profile} onChange={patch} />}

            {step === 4 && (
              <div>
                {data.skills.length > 0 && (
                  <p className="mb-6 text-sm text-ink-muted">
                    Already on your passport: {data.skills.map((s) => s.name).join(', ')}
                  </p>
                )}
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
                    />
                  </label>
                  <Button type="submit" variant="secondary">
                    Add
                  </Button>
                </form>
                {customSkillError && (
                  <p className="mt-2 text-sm text-critical">{customSkillError}</p>
                )}
                {selectedSkills.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm text-ink-faint">
                      Adding {selectedSkills.length} as Self-reported. Tap one to remove it.
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
                        {group.skills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={selectedSkills.some(
                              (s) => s.toLowerCase() === skill.toLowerCase()
                            )}
                            onClick={() => handleSkillToggle(skill)}
                            className="pill"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isLast && <CareerProfileSummary data={data} />}
          </div>
        </section>

        {error && (
          <p role="alert" className="mb-4 text-sm text-critical">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="size-4" aria-hidden />}
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || busy}
          >
            Back
          </Button>
          {isLast ? (
            <Button onClick={finish} isLoading={busy}>
              Go to my dashboard
            </Button>
          ) : (
            <Button
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
              onClick={() => goTo(step + 1)}
              isLoading={busy}
            >
              Next
            </Button>
          )}
        </div>
        {!isLast && (
          <p className="mt-3 text-right text-xs text-ink-faint">
            Optional questions can be left blank. Your progress is saved.
          </p>
        )}
      </div>
    </AppPageShell>
  )
}
