'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Code,
  FileText,
  Mic,
  Upload,
  CheckCircle,
  Clock,
  Brain,
  Shield,
  TrendingUp,
  Play,
  X,
  File,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { useToast } from '@/components/UI/ToastProvider'
import Confetti from '@/components/UI/Confetti'
import { easing } from '@/lib/utils/animations'

const evidenceTypes = [
  {
    id: 'video',
    name: 'Video Submission',
    icon: Video,
    description: 'Record yourself performing tasks or explaining concepts',
    requirements: ['720p or higher', '5 minutes max', 'Clear audio'],
    examples: ['Code walkthrough', 'Presentation', 'Tutorial', 'Demo'],
  },
  {
    id: 'code',
    name: 'Code Repository',
    icon: Code,
    description: 'Submit GitHub, GitLab, or code samples for analysis',
    requirements: ['Working code', 'Readme file', 'Tests included'],
    examples: ['GitHub repo', 'Code snippet', 'Project files', 'Portfolio'],
  },
  {
    id: 'document',
    name: 'Document Analysis',
    icon: FileText,
    description: 'Upload documents, presentations, or case studies',
    requirements: ['PDF format', '10MB max', 'Clear structure'],
    examples: ['Research paper', 'Case study', 'Report', 'Presentation'],
  },
  {
    id: 'audio',
    name: 'Audio Assessment',
    icon: Mic,
    description: 'Submit audio recordings of presentations or discussions',
    requirements: ['Clear speech', '5 minutes max', 'Minimal background noise'],
    examples: ['Podcast', 'Interview', 'Presentation', 'Discussion'],
  },
  {
    id: 'simulation',
    name: 'AI Simulation',
    icon: Brain,
    description: 'Complete AI-generated skill challenges',
    requirements: ['Real-time completion', 'No external help', 'Time-limited'],
    examples: ['Coding challenge', 'Problem-solving', 'Scenario test', 'Skill quiz'],
  },
  {
    id: 'project',
    name: 'Project Portfolio',
    icon: File,
    description: 'Share completed projects or case studies',
    requirements: ['Live demo', 'Documentation', 'Results shown'],
    examples: ['Web app', 'Mobile app', 'Design system', 'Research project'],
  },
]

const verificationSteps = [
  {
    step: 1,
    title: 'Upload Evidence',
    description: 'Submit your proof of capability',
    icon: Upload,
  },
  {
    step: 2,
    title: 'AI Analysis',
    description: 'Multimodal AI evaluates your submission',
    icon: Brain,
  },
  {
    step: 3,
    title: 'Skill Scoring',
    description: 'Get detailed scores and feedback',
    icon: TrendingUp,
  },
  {
    step: 4,
    title: 'Verification',
    description: 'Receive verified badge and passport update',
    icon: Shield,
  },
]

interface PendingVerification {
  id: string
  skillName: string
  type: string
  submittedAt: string
  status: 'processing' | 'review' | 'completed'
  progress: number
  estimatedTime: string
}

interface CompletedVerification {
  id: string
  skillName: string
  type: string
  completedAt: string
  score: number
  confidence: number
  strengths: string[]
  improvements: string[]
  verified: boolean
}

export default function VerificationPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [pendingVerifications] = useState<PendingVerification[]>([
    {
      id: '1',
      skillName: 'React Development',
      type: 'code',
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'processing',
      progress: 65,
      estimatedTime: '2 hours',
    },
    {
      id: '2',
      skillName: 'Public Speaking',
      type: 'video',
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'review',
      progress: 90,
      estimatedTime: '1 day',
    },
  ])
  const [completedVerifications] = useState<CompletedVerification[]>([
    {
      id: '1',
      skillName: 'Machine Learning',
      type: 'code',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      score: 92,
      confidence: 94,
      strengths: ['Clean implementation', 'Good documentation', 'Effective algorithms'],
      improvements: ['Add more tests', 'Improve error handling'],
      verified: true,
    },
    {
      id: '2',
      skillName: 'Team Leadership',
      type: 'video',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      score: 88,
      confidence: 87,
      strengths: ['Clear communication', 'Effective delegation', 'Positive feedback'],
      improvements: ['More strategic thinking examples'],
      verified: true,
    },
  ])
  const { addToast } = useToast()

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const fileArray = Array.from(files)
    setUploadedFiles((prev: File[]) => [...prev, ...fileArray])

    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsUploading(false)
    setShowConfetti(true)
    addToast({
      type: 'success',
      title: 'Evidence Uploaded!',
      message: 'AI analysis has started. Results will be available soon.',
    })

    setTimeout(() => setShowConfetti(false), 3000)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer?.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const selectedEvidenceType = evidenceTypes.find((t) => t.id === selectedType)

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Confetti trigger={showConfetti} />
      
      <div className="page-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 md:mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 border border-black/10 dark:border-white/10">
              <Brain className="w-8 h-8 text-black dark:text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-2 tracking-tight leading-[1.1] max-w-[14ch] md:max-w-none">
                AI Verification
              </h1>
              <p className="text-base md:text-lg text-black/60 dark:text-white/60 max-w-[38ch] md:max-w-2xl">
                Submit evidence and get your skills verified by multimodal AI
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            {['Evidence quality', 'AI confidence', 'Verification speed'].map((item) => (
              <div key={item} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/45 px-4 py-3 text-sm text-black/70 dark:text-white/70">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Verification Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-6 mb-10 md:mb-16">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="border border-black/10 dark:border-white/10 p-6 text-center bg-white/75 dark:bg-black/50">
                  <div className="w-12 h-12 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <div className="text-2xl font-bold text-black dark:text-white mb-2">
                    {step.step}
                  </div>
                  <h3 className="font-medium text-black dark:text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Evidence Type Selection */}
            <div className="border border-black/10 dark:border-white/10 p-8 bg-white/75 dark:bg-black/50">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Select Evidence Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {evidenceTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 text-left border transition-colors ${
                        isSelected
                          ? 'border-black dark:border-white bg-black/5 dark:bg-white/5'
                          : 'border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white'
                      }`}
                    >
                      <div className="w-12 h-12 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-black dark:text-white" />
                      </div>
                      <h3 className="font-medium text-black dark:text-white mb-1">{type.name}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60">
                        {type.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Upload Area */}
            {selectedType && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="border border-black/10 dark:border-white/10 p-8 bg-white/75 dark:bg-black/50">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                          Upload {selectedEvidenceType?.name}
                        </h2>
                        <p className="text-black/60 dark:text-white/60">
                          {selectedEvidenceType?.description}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedType(null)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:opacity-70 transition-opacity"
                      >
                        <X className="w-5 h-5 text-black dark:text-white" />
                      </button>
                    </div>

                    {/* Requirements */}
                    <div className="mb-6 p-4 border border-black/10 dark:border-white/10">
                      <h4 className="font-medium text-black dark:text-white mb-3">Requirements:</h4>
                      <ul className="space-y-2">
                        {selectedEvidenceType?.requirements.map((req, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
                            <CheckCircle className="w-4 h-4 text-black dark:text-white" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Examples */}
                    <div className="mb-6">
                      <h4 className="font-medium text-black dark:text-white mb-3">Examples:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvidenceType?.examples.map((example, index) => (
                          <Badge key={index} variant="default" size="sm">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Upload Zone */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-black/20 dark:border-white/20 p-12 text-center hover:border-black dark:hover:border-white transition-colors"
                    >
                      <Upload className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
                      <h3 className="text-xl font-medium text-black dark:text-white mb-2">
                        Drag and drop files here
                      </h3>
                      <p className="text-black/60 dark:text-white/60 mb-6">
                        or click to browse
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e.target?.files || null)}
                        className="hidden"
                        id="file-upload"
                        accept={
                          selectedType === 'video'
                            ? 'video/*'
                            : selectedType === 'audio'
                            ? 'audio/*'
                            : selectedType === 'document'
                            ? '.pdf,.doc,.docx'
                            : selectedType === 'code'
                            ? '.zip,.tar,.gz'
                            : '*'
                        }
                      />
                      <label htmlFor="file-upload">
                        <Button
                          isLoading={isUploading}
                          leftIcon={<Upload className="w-5 h-5" />}
                        >
                          {isUploading ? 'Uploading...' : 'Select Files'}
                        </Button>
                      </label>
                      <p className="text-sm text-black/60 dark:text-white/60 mt-4">
                        Supported: {selectedType === 'video' ? 'MP4, MOV, AVI' : selectedType === 'audio' ? 'MP3, WAV, M4A' : selectedType === 'document' ? 'PDF, DOC, DOCX' : 'ZIP, TAR, GZ'}
                      </p>
                    </div>

                    {/* Uploaded Files */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-6 space-y-2">
                        <h4 className="font-medium text-black dark:text-white">Uploaded Files:</h4>
                        {uploadedFiles.map((file: File, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-black/10 dark:border-white/10"
                          >
                            <div className="flex items-center gap-3">
                              <File className="w-5 h-5 text-black/60 dark:text-white/60" />
                              <div>
                                <div className="font-medium text-sm text-black dark:text-white">{file.name}</div>
                                <div className="text-xs text-black/60 dark:text-white/60">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setUploadedFiles((prev: File[]) =>
                                  prev.filter((_: File, i: number) => i !== index)
                                )
                              }
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:opacity-70 transition-opacity"
                            >
                              <X className="w-4 h-4 text-black dark:text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* AI Simulation Option */}
            <div className="border border-black/10 dark:border-white/10 p-8 bg-white/75 dark:bg-black/50">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 border border-black/10 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-8 h-8 text-black dark:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black dark:text-white mb-2">AI-Generated Skill Simulation</h3>
                  <p className="text-black/60 dark:text-white/60 mb-4">
                    Complete real-time challenges tailored to your skill level
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Coding Challenge', 'Problem Solving', 'Design Task', 'Business Case'].map(
                      (challenge) => (
                        <Badge key={challenge} variant="default" size="sm">
                          {challenge}
                        </Badge>
                      )
                    )}
                  </div>
                  <Button
                    leftIcon={<Play className="w-5 h-5" />}
                    onClick={() => {
                      addToast({
                        type: 'info',
                        title: 'Simulation Starting',
                        message: 'Redirecting to AI challenge...',
                      })
                    }}
                  >
                    Start AI Simulation
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Verifications */}
            <div className="border border-black/10 dark:border-white/10 p-6 bg-white/75 dark:bg-black/50">
              <h3 className="text-lg font-bold text-black dark:text-white mb-6">Pending Verifications</h3>
              <div className="space-y-4">
                {pendingVerifications.map((verification: PendingVerification) => (
                  <div
                    key={verification.id}
                    className="p-4 border border-black/10 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-black dark:text-white">{verification.skillName}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                        <span className="text-xs text-black/60 dark:text-white/60 capitalize">{verification.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {verification.estimatedTime}
                      </span>
                      <span>{verification.progress}%</span>
                    </div>
                    <div className="h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${verification.progress}%` }}
                        className="h-full bg-black dark:bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Verifications */}
            <div className="border border-black/10 dark:border-white/10 p-6 bg-white/75 dark:bg-black/50">
              <h3 className="text-lg font-bold text-black dark:text-white mb-6">Recently Verified</h3>
              <div className="space-y-4">
                {completedVerifications.map((verification: CompletedVerification) => (
                  <div
                    key={verification.id}
                    className="p-4 border border-black/10 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-black dark:text-white">{verification.skillName}</div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-5 h-5 text-black dark:text-white" />
                        <span className="text-sm font-medium text-black dark:text-white">Verified</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-black dark:text-white">{verification.score}/100</div>
                        <div className="text-xs text-black/60 dark:text-white/60">Score</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-black dark:text-white">{verification.confidence}%</div>
                        <div className="text-xs text-black/60 dark:text-white/60">AI Confidence</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-black/60 dark:text-white/60">Strengths:</div>
                      {verification.strengths.slice(0, 2).map((strength: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
                          <CheckCircle className="w-3 h-3 text-black dark:text-white" />
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Stats */}
            <div className="border border-black/10 dark:border-white/10 p-6 bg-white/75 dark:bg-black/50">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-black dark:text-white" />
                <div>
                  <h3 className="font-medium text-black dark:text-white">Verification Stats</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    Your performance
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1 text-black dark:text-white">
                    <span>Success Rate</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <div className="h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-black dark:bg-white w-[94%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 text-black dark:text-white">
                    <span>Average Score</span>
                    <span className="font-medium">88/100</span>
                  </div>
                  <div className="h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-black dark:bg-white w-[88%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 text-black dark:text-white">
                    <span>Verification Speed</span>
                    <span className="font-medium">2.3h avg</span>
                  </div>
                  <div className="h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-black dark:bg-white w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
