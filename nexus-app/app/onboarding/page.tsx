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
import Badge from '@/components/UI/Badge'
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
  'JavaScript', 'Python', 'React', 'TypeScript', 'Node.js',
  'Design', 'Leadership', 'Communication', 'Problem Solving',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    )
  }

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setShowConfetti(true)
    addToast({
      type: 'success',
      title: 'Welcome to Nexus!',
      message: 'Your account is set up. Start adding skills to get verified.',
    })
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const canProceed = () => {
    if (currentStep === 2) return selectedGoals.length > 0
    if (currentStep === 3) return selectedSkills.length > 0
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
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
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatedCard className="p-8 md:p-12">
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
                <h2 className="text-3xl font-bold mb-4">Welcome to Nexus!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  We&apos;ll help you create a verified skill profile in just a few steps. 
                  This takes about 2 minutes.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                    <CheckCircle className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">AI-Verified</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                    <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Global Recognition</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Career Matching</p>
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
                  <h2 className="text-3xl font-bold mb-2">What are your goals?</h2>
                  <p className="text-gray-600 dark:text-gray-400">
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
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white mb-4`}>
                        {goal.icon}
                      </div>
                      <h3 className="font-semibold mb-1">{goal.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{goal.description}</p>
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
                  <h2 className="text-3xl font-bold mb-2">Add Your Skills</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select your skills (you can add more later)
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {initialSkills.map((skill) => (
                    <motion.button
                      key={skill}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-4 py-2 rounded-full font-medium transition-all ${
                        selectedSkills.includes(skill)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {skill}
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mt-6">
                  Selected: {selectedSkills.length} skills
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
                <h2 className="text-3xl font-bold mb-4">You&apos;re All Set! 🎉</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  Your Nexus profile is ready. Start adding more skills, get verified, 
                  and discover career opportunities matched to your profile.
                </p>
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
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>
            <Button
              rightIcon={currentStep === steps.length ? undefined : <ArrowRight className="w-5 h-5" />}
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === steps.length ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
