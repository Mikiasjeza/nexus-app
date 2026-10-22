'use client'

import React, { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Code,
  Palette,
  MessageSquare,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { useToast } from '@/components/UI/ToastProvider'
import Confetti from '@/components/UI/Confetti'
import { easing } from '@/lib/utils/animations'
import {
  normalizeSkillName,
  SKILL_PILLAR_DETAILS,
  SKILL_SUGGESTION_GROUPS,
} from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import type { SkillCategory } from '@/lib/types'

const steps = [
  {
    id: 1,
    title: 'Welcome',
    description: "Let's set up your Nexus profile",
    icon: <Sparkles className="w-8 h-8" />,
  },
  {
    id: 2,
    title: 'Your Goals',
    description: 'What are you looking to achieve?',
    icon: <Target className="w-8 h-8" />,
  },
  {
    id: 3,
    title: 'Add Skills',
    description: 'Add your first skills to get started',
    icon: <Plus className="w-8 h-8" />,
  },
  {
    id: 4,
    title: 'Complete',
    description: "You're all set!",
    icon: <CheckCircle className="w-8 h-8" />,
  },
]

const goals = [
  {
    id: 'career',
    title: 'Career Growth',
    description: 'Advance in my current field',
    icon: <TrendingUp className="w-6 h-6" />,
    color: ' ',
  },
  {
    id: 'job-search',
    title: 'Find New Job',
    description: 'Get matched with opportunities',
    icon: <Briefcase className="w-6 h-6" />,
    color: ' ',
  },
  {
    id: 'skill-verification',
    title: 'Verify Skills',
    description: 'Get AI-verified credentials',
    icon: <GraduationCap className="w-6 h-6" />,
    color: ' ',
  },
  {
    id: 'learning',
    title: 'Skill Development',
    description: 'Track my learning journey',
    icon: <User className="w-6 h-6" />,
    color: ' ',
  },
]

const MAX_ONBOARDING_SKILLS = 15

const pillarVisuals: Record<
  SkillCategory,
  { icon: React.ReactNode; cardClass: string; chipClass: string }
> = {
  'Technical Skills': {
    icon: <Code className="w-5 h-5" />,
    cardClass: 'border-verified/40 bg-verified-wash',
    chipClass: 'bg-verified-wash text-verified-ink hover:bg-verified-wash',
  },
  'Creative Skills': {
    icon: <Palette className="w-5 h-5" />,
    cardClass: 'border-verified/40 bg-verified-wash',
    chipClass: 'bg-verified-wash text-verified-ink hover:bg-verified-wash',
  },
  'Communication Skills': {
    icon: <MessageSquare className="w-5 h-5" />,
    cardClass: 'border-verified/40 bg-verified-wash',
    chipClass: 'bg-verified-wash text-verified-ink hover:bg-verified-wash',
  },
  'Professional Skills': {
    icon: <Briefcase className="w-5 h-5" />,
    cardClass: 'border-verified/40 bg-verified-wash',
    chipClass: 'bg-verified-wash text-verified-ink hover:bg-verified-wash',
  },
  'Learning & Growth': {
    icon: <TrendingUp className="w-5 h-5" />,
    cardClass: 'border-caution/40 bg-caution/15',
    chipClass: 'bg-caution/15 text-caution hover:bg-caution/15',
  },
}

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
  const [showConfetti, setShowConfetti] = useState(false)

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

      setShowConfetti(true)
      addToast({
        type: 'success',
        title: 'Welcome to Nexus!',
        message: 'Your profile is ready. Opening your dashboard now.',
      })

      await new Promise((resolve) => window.setTimeout(resolve, 1200))
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

  return (
    <AppPageShell className="flex min-h-screen items-center justify-center bg-ground p-4">
      <Confetti trigger={showConfetti} />

      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      currentStep >= step.id ? 'bg-ink text-ground' : 'bg-pill text-ink-faint'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </motion.div>
                  <span
                    className={`text-xs font-medium ${
                      currentStep >= step.id ? 'text-verified-ink' : 'text-ink-faint'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-verified-wash' : 'bg-pill'
                    }`}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatedCard className="gradient-border-card p-8 md:p-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: easing.primary }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-ink" />
                </div>
                <h2 className="text-3xl font-bold text-ink mb-4">Welcome to Nexus</h2>
                <p className="text-ink-muted mb-8 max-w-2xl mx-auto">
                  Build your profile around five skill pillars so Nexus can understand what you
                  build, create, explain, lead, and improve over time.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-line bg-raised">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium text-ink">Pillar-based verification</p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-raised">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium text-ink">Proof that feels credible</p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-raised">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium text-ink">Better matches and guidance</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  {SKILL_PILLAR_DETAILS.map((pillar) => (
                    <div
                      key={pillar.category}
                      className="rounded-2xl border border-line bg-raised px-3 py-4 text-left"
                    >
                      <div className="text-xs uppercase tracking-[0.22em] text-ink-faint">
                        {pillar.shortLabel}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-ink">{pillar.category}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Goals */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: easing.primary }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-ink" />
                  </div>
                  <h2 className="text-3xl font-bold text-ink mb-2">What are your goals?</h2>
                  <p className="text-ink-muted">Optional. Select any that apply, or skip.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <motion.button
                      key={goal.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGoalToggle(goal.id)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        selectedGoals.includes(goal.id)
                          ? 'border-verified/40 bg-pill'
                          : 'border-line hover:border-verified/40'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl  ${goal.color} flex items-center justify-center text-ink mb-4`}
                      >
                        {goal.icon}
                      </div>
                      <h3 className="font-semibold text-ink mb-1">{goal.title}</h3>
                      <p className="text-sm text-ink-muted">{goal.description}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Skills */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: easing.primary }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-ink" />
                  </div>
                  <h2 className="text-3xl font-bold text-ink mb-2">Add Your Skills</h2>
                  <p className="text-ink-muted">
                    Choose from the five pillars below or add your own custom skills.
                  </p>
                </div>
                <div className="max-w-3xl mx-auto">
                  <div className="mb-6 rounded-2xl border border-line bg-raised p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <input
                        type="text"
                        value={customSkill}
                        onChange={(event) => {
                          setCustomSkill(event.target.value)
                          if (customSkillError) {
                            setCustomSkillError(null)
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleCustomSkillAdd()
                          }
                        }}
                        className="min-h-[48px] flex-1 rounded-xl border border-line bg-ground/70 px-4 text-ink outline-none transition focus:border-verified/40"
                        placeholder="Add your own skill, like Salesforce, C++, or Recruiting"
                      />
                      <Button type="button" onClick={handleCustomSkillAdd}>
                        Add Skill
                      </Button>
                    </div>
                    {customSkillError && (
                      <p className="mt-3 text-sm text-critical">{customSkillError}</p>
                    )}
                  </div>

                  {selectedSkills.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-ink-faint">
                        Selected skills
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedSkills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleSkillToggle(skill)}
                            className="rounded-full border border-verified/40 bg-verified-wash px-4 py-2 text-sm font-medium text-ink transition hover:border-verified/40 hover:bg-verified-wash"
                          >
                            {skill} x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {SKILL_PILLAR_DETAILS.map((pillar) => {
                      const visual = pillarVisuals[pillar.category]
                      return (
                        <div
                          key={pillar.category}
                          className={`rounded-2xl border px-4 py-4 ${visual.cardClass}`}
                        >
                          <div className="mb-3 inline-flex rounded-xl border border-line bg-ground/70 p-2 text-ink">
                            {visual.icon}
                          </div>
                          <div className="text-sm font-semibold text-ink">{pillar.category}</div>
                          <p className="mt-2 text-sm text-ink-muted">{pillar.summary}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-5">
                    {SKILL_SUGGESTION_GROUPS.map((group) => (
                      <div
                        key={group.id}
                        className={`rounded-3xl border p-5 ${pillarVisuals[group.label as SkillCategory].cardClass}`}
                      >
                        <div className="mb-2 flex items-center gap-3 text-ink">
                          <div className="rounded-xl border border-line bg-ground/70 p-2">
                            {pillarVisuals[group.label as SkillCategory].icon}
                          </div>
                          <div className="text-sm font-medium uppercase tracking-[0.2em] text-ink-muted">
                            {group.label}
                          </div>
                        </div>
                        <p className="mb-4 max-w-2xl text-sm text-ink-muted">{group.description}</p>
                        <div className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-ink-faint">
                          Suggested skills
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.skills.map((skill) => {
                            const isSelected = selectedSkills.some(
                              (selectedSkill) => selectedSkill.toLowerCase() === skill.toLowerCase()
                            )

                            return (
                              <motion.button
                                key={skill}
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSkillToggle(skill)}
                                className={`px-4 py-2 rounded-full font-medium transition-all ${
                                  isSelected
                                    ? 'bg-ink text-ground'
                                    : pillarVisuals[group.label as SkillCategory].chipClass
                                }`}
                              >
                                {skill}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-center text-sm text-ink-faint mt-6">
                  Selected: {selectedSkills.length} of {MAX_ONBOARDING_SKILLS} skills
                </p>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: easing.primary }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-ink" />
                </motion.div>
                <h2 className="text-3xl font-bold text-ink mb-4">You&apos;re All Set</h2>
                <p className="text-ink-muted mb-8 max-w-2xl mx-auto">
                  Your Nexus profile is ready. Start building proof across the five pillars, verify
                  your strongest skills, and unlock better career guidance.
                </p>
                {completionError && (
                  <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-critical/40 bg-critical/15 px-4 py-3 text-sm text-critical">
                    {completionError}
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium">Profile Created</p>
                  </AnimatedCard>
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      {selectedSkills.length} {selectedSkills.length === 1 ? 'skill' : 'skills'} to
                      add
                    </p>
                  </AnimatedCard>
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-verified mx-auto mb-2" />
                    <p className="text-sm font-medium">Ready to Verify</p>
                  </AnimatedCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-line">
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              onClick={handleBack}
              disabled={currentStep === 1 || isCompleting}
            >
              Back
            </Button>
            <div className="text-sm text-ink-faint">
              Step {currentStep} of {steps.length}
            </div>
            <Button
              rightIcon={
                currentStep === steps.length ? undefined : <ArrowRight className="w-5 h-5" />
              }
              onClick={handleNext}
              isLoading={isCompleting}
              disabled={isCompleting}
            >
              {currentStep === steps.length
                ? 'Get Started'
                : isSkippableEmptyStep
                  ? 'Skip for now'
                  : 'Next'}
            </Button>
          </div>
        </AnimatedCard>
      </div>
    </AppPageShell>
  )
}
