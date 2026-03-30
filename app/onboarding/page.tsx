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
  TrendingUp
} from 'lucide-react'
import Button from '@/components/UI/Button'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { useToast } from '@/components/UI/ToastProvider'
import Confetti from '@/components/UI/Confetti'
import { easing } from '@/lib/utils/animations'

const steps = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Let\'s set up your Nexus profile',
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
    description: 'You\'re all set!',
    icon: <CheckCircle className="w-8 h-8" />,
  },
]

const goals = [
  {
    id: 'career',
    title: 'Career Growth',
    description: 'Advance in my current field',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'job-search',
    title: 'Find New Job',
    description: 'Get matched with opportunities',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'skill-verification',
    title: 'Verify Skills',
    description: 'Get AI-verified credentials',
    icon: <GraduationCap className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'learning',
    title: 'Skill Development',
    description: 'Track my learning journey',
    icon: <User className="w-6 h-6" />,
    color: 'from-orange-500 to-amber-500',
  },
]

const initialSkills = [
  {
    label: 'Engineering',
    skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Java', 'SQL'],
  },
  {
    label: 'Data & AI',
    skills: ['Data Analysis', 'Machine Learning', 'Prompt Engineering', 'Power BI', 'Tableau', 'Excel'],
  },
  {
    label: 'Design & Product',
    skills: ['UI Design', 'UX Research', 'Figma', 'Product Strategy', 'Wireframing', 'Accessibility'],
  },
  {
    label: 'Business & Growth',
    skills: ['Project Management', 'Marketing', 'Sales', 'Operations', 'Customer Success', 'Analytics'],
  },
  {
    label: 'Leadership',
    skills: ['Leadership', 'Communication', 'Problem Solving', 'Coaching', 'Public Speaking', 'Negotiation'],
  },
]

const MAX_ONBOARDING_SKILLS = 15

function normalizeSkillName(skill: string) {
  return skill.trim().replace(/\s+/g, ' ')
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
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    )
  }

  const handleSkillToggle = (skill: string) => {
    const normalizedSkill = normalizeSkillName(skill)
    setCustomSkillError(null)
    setSelectedSkills(prev => {
      const hasSkill = prev.some(existing => existing.toLowerCase() === normalizedSkill.toLowerCase())

      if (hasSkill) {
        return prev.filter(existing => existing.toLowerCase() !== normalizedSkill.toLowerCase())
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

    if (selectedSkills.some(skill => skill.toLowerCase() === normalizedSkill.toLowerCase())) {
      setCustomSkillError('That skill is already selected.')
      return
    }

    if (selectedSkills.length >= MAX_ONBOARDING_SKILLS) {
      setCustomSkillError(`Choose up to ${MAX_ONBOARDING_SKILLS} skills for now.`)
      return
    }

    setSelectedSkills(prev => [...prev, normalizedSkill])
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

      await new Promise(resolve => window.setTimeout(resolve, 1200))
      router.replace('/dashboard')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not finish onboarding. Please try again.'
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

  const canProceed = () => {
    if (currentStep === 2) return selectedGoals.length > 0
    if (currentStep === 3) return selectedSkills.length > 0
    return true
  }

  return (
    <div className="aurora-shell min-h-screen bg-black flex items-center justify-center p-4">
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
                      currentStep >= step.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/45'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-cyan-200' : 'text-white/45'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-cyan-300/80' : 'bg-white/10'
                  }`} />
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
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to Nexus</h2>
                <p className="text-white/60 mb-8 max-w-2xl mx-auto">
                  We&apos;ll help you create a verified skill profile in just a few steps. 
                  This takes about 2 minutes.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <CheckCircle className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">AI-Verified</p>
                  </div>
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Global Recognition</p>
                  </div>
                  <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Career Matching</p>
                  </div>
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">What are your goals?</h2>
                  <p className="text-white/60">
                    Select all that apply (you can change this later)
                  </p>
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
                          ? 'border-cyan-300/70 bg-white/10'
                          : 'border-white/10 hover:border-cyan-300/40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white mb-4`}>
                        {goal.icon}
                      </div>
                      <h3 className="font-semibold text-white mb-1">{goal.title}</h3>
                      <p className="text-sm text-white/60">{goal.description}</p>
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Add Your Skills</h2>
                  <p className="text-white/60">
                    Choose from the list below or add your own custom skills
                  </p>
                </div>
                <div className="max-w-3xl mx-auto">
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
                        className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition focus:border-cyan-300/60"
                        placeholder="Add your own skill, like Salesforce, C++, or Recruiting"
                      />
                      <Button type="button" onClick={handleCustomSkillAdd}>
                        Add Skill
                      </Button>
                    </div>
                    {customSkillError && (
                      <p className="mt-3 text-sm text-rose-300">{customSkillError}</p>
                    )}
                  </div>

                  {selectedSkills.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                        Selected skills
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedSkills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleSkillToggle(skill)}
                            className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-200 hover:bg-cyan-300/15"
                          >
                            {skill} x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    {initialSkills.map((group) => (
                      <div key={group.label}>
                        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/45">
                          {group.label}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.skills.map((skill) => {
                            const isSelected = selectedSkills.some(
                              selectedSkill => selectedSkill.toLowerCase() === skill.toLowerCase()
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
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-white/75 hover:bg-white/10'
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
                <p className="text-center text-sm text-white/45 mt-6">
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
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-4">You&apos;re All Set</h2>
                <p className="text-white/60 mb-8 max-w-2xl mx-auto">
                  Your Nexus profile is ready. Start adding more skills, get verified, 
                  and discover career opportunities matched to your profile.
                </p>
                {completionError && (
                  <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {completionError}
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Profile Created</p>
                  </AnimatedCard>
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">{selectedSkills.length} Skills Added</p>
                  </AnimatedCard>
                  <AnimatedCard className="p-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Ready to Verify</p>
                  </AnimatedCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/10">
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              onClick={handleBack}
              disabled={currentStep === 1 || isCompleting}
            >
              Back
            </Button>
            <div className="text-sm text-white/45">
              Step {currentStep} of {steps.length}
            </div>
            <Button
              rightIcon={currentStep === steps.length ? undefined : <ArrowRight className="w-5 h-5" />}
              onClick={handleNext}
              isLoading={isCompleting}
              disabled={!canProceed() || isCompleting}
            >
              {currentStep === steps.length ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
