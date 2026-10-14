'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Code,
  FileText,
  Mic,
  CheckCircle,
  Brain,
  Shield,
  TrendingUp,
  File,
  Sparkles,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import { useToast } from '@/components/UI/ToastProvider'
import Confetti from '@/components/UI/Confetti'
import { aiApi, authApi, skillsApi } from '@/lib/api'
import type { AnalysisHistoryItem, EvidenceInput } from '@/lib/api/ai'
import type { Skill, User } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/utils/constants'
import {
  getSkillPillarDetail,
  getSkillPillarForName,
  SKILL_PILLAR_DETAILS,
} from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import {
  MAX_UPLOAD_BYTES,
  TEXT_UPLOAD_EXTENSIONS,
  UPLOAD_EXTENSIONS,
  fileExtension,
} from '@/lib/storage/upload-limits'

const UPLOAD_ACCEPT = UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',')
const isTextUpload = (file: File) =>
  (TEXT_UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))

type EvidenceTypeId = 'code' | 'video' | 'document' | 'audio' | 'project'

const evidenceTypes: Array<{
  id: EvidenceTypeId
  name: string
  icon: typeof Code
  description: string
  requirements: string[]
  examples: string[]
  primaryLabel: string
  helperText: string
  needsUrl: boolean
  supportsUrl: boolean
}> = [
  {
    id: 'code',
    name: 'Code Proof',
    icon: Code,
    description:
      'Paste a code sample, repository context, or implementation notes for AI to assess.',
    requirements: [
      'Include real code',
      'Add context on what you built',
      'Mention your specific contribution',
    ],
    examples: ['API endpoint', 'Component implementation', 'Automation script', 'Data pipeline'],
    primaryLabel: 'Code sample',
    helperText: 'Paste the most important code or architecture excerpt.',
    needsUrl: false,
    supportsUrl: true,
  },
  {
    id: 'video',
    name: 'Video Walkthrough',
    icon: Video,
    description:
      'Share a walkthrough link plus a concise summary of what the reviewer should notice.',
    requirements: ['Explain what was built', 'Call out your role', 'Highlight outcomes or impact'],
    examples: ['Demo video', 'Recorded presentation', 'Tutorial clip', 'Pitch walkthrough'],
    primaryLabel: 'Summary for the AI reviewer',
    helperText: 'Describe what the video shows and what should count as proof.',
    needsUrl: false,
    supportsUrl: true,
  },
  {
    id: 'document',
    name: 'Document Evidence',
    icon: FileText,
    description:
      'Summarize a case study, report, or written artifact and optionally add a public link.',
    requirements: [
      'Mention scope',
      'Explain decisions made',
      'Show measurable outcomes when possible',
    ],
    examples: ['Case study', 'Research paper', 'Strategy memo', 'Presentation deck'],
    primaryLabel: 'Document summary',
    helperText: 'Give the AI enough detail to understand what the document proves.',
    needsUrl: false,
    supportsUrl: true,
  },
  {
    id: 'audio',
    name: 'Audio Evidence',
    icon: Mic,
    description: 'Describe the audio evidence and include a link if it is hosted publicly.',
    requirements: ['Clarify the topic', 'Explain your role', 'Mention the strongest moments'],
    examples: ['Interview', 'Podcast clip', 'Meeting presentation', 'Public talk'],
    primaryLabel: 'Audio summary',
    helperText: 'Tell the AI what the audio demonstrates about your skill.',
    needsUrl: false,
    supportsUrl: true,
  },
  {
    id: 'project',
    name: 'Project Proof',
    icon: File,
    description: 'Point to a live project or portfolio piece and summarize the proof behind it.',
    requirements: [
      'Include a live URL or repository',
      'State your contribution',
      'Mention business or user impact',
    ],
    examples: ['Web app', 'Mobile app', 'Design system', 'Marketing campaign'],
    primaryLabel: 'Project summary',
    helperText: 'Focus on the result, your scope, and the evidence of quality.',
    needsUrl: true,
    supportsUrl: true,
  },
]

const verificationSteps = [
  {
    step: 1,
    title: 'Choose Skill',
    description: 'Pick the capability you want to prove',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'Add Evidence',
    description: 'Paste code, notes, links, or project context',
    icon: FileText,
  },
  {
    step: 3,
    title: 'AI Review',
    description: 'Run an objective skill analysis on your proof',
    icon: Brain,
  },
  {
    step: 4,
    title: 'Save Result',
    description: 'Store the analysis and upgrade profile trust',
    icon: Shield,
  },
]

const guestSampleAnalyses: AnalysisHistoryItem[] = [
  {
    id: 'guest-1',
    skillId: 'guest-react',
    skillName: 'React Development',
    skillLevel: 'advanced',
    confidenceScore: 0.91,
    explanation:
      'The evidence shows solid component structure, clear state handling, and product thinking around UX polish and maintainability.',
    suggestedLevel: 'advanced',
    improvements: ['Add stronger testing proof', 'Include performance profiling notes'],
    tokensUsed: 1180,
    cost: 0.01,
    model: 'gemini-2.5-flash',
    verified: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'guest-2',
    skillId: 'guest-speaking',
    skillName: 'Public Speaking',
    skillLevel: 'intermediate',
    confidenceScore: 0.83,
    explanation:
      'The walkthrough demonstrates confidence and clear communication, but could use more proof of audience impact or adaptation under pressure.',
    suggestedLevel: 'advanced',
    improvements: ['Add audience outcomes', 'Include a second example in a different setting'],
    tokensUsed: 940,
    cost: 0.01,
    model: 'gemini-2.5-flash',
    verified: true,
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
]

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.round(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default function VerificationPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisHistoryItem[]>([])
  const [selectedType, setSelectedType] = useState<EvidenceTypeId>('code')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('typescript')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisHistoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)

  const isGuestPreview = user?.id === 'guest-user'
  const selectedEvidenceType =
    evidenceTypes.find((type) => type.id === selectedType) ?? evidenceTypes[0]
  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? null
  const displayedAnalyses = isGuestPreview ? guestSampleAnalyses : recentAnalyses
  const selectedPillar = selectedSkill ? getSkillPillarDetail(selectedSkill.category) : null

  useEffect(() => {
    let isActive = true

    async function loadPageData() {
      try {
        const currentUser = await authApi.getCurrentUser()
        if (!isActive) return

        setUser(currentUser)

        if (!currentUser) {
          setSkills([])
          setRecentAnalyses([])
          return
        }

        const [skillData, historyData] = await Promise.all([
          skillsApi.getAll(),
          aiApi.getHistory(8).catch(() => []),
        ])

        if (!isActive) return

        setSkills(skillData)
        setRecentAnalyses(historyData)
        setSelectedSkillId((prev) => prev || skillData[0]?.id || '')
      } catch (error) {
        if (!isActive) return
        console.error('Verification page load error:', error)
        setSkills([])
        setRecentAnalyses([])
      } finally {
        if (isActive) {
          setIsLoadingData(false)
        }
      }
    }

    loadPageData()

    return () => {
      isActive = false
    }
  }, [])

  const stats = useMemo(() => {
    const total = displayedAnalyses.length
    const verifiedCount = displayedAnalyses.filter((item) => item.verified).length
    const avgConfidence =
      total > 0
        ? Math.round(
            (displayedAnalyses.reduce((sum, item) => sum + item.confidenceScore, 0) / total) * 100
          )
        : 0

    return {
      total,
      verifiedRate: total > 0 ? Math.round((verifiedCount / total) * 100) : 0,
      avgConfidence,
    }
  }, [displayedAnalyses])

  const requireAccount = () => {
    addToast({
      type: 'info',
      title: 'Sign in required',
      message: 'Create an account or sign in to run AI verification.',
    })
    router.push('/auth/login?next=/verification')
  }

  const clearEvidenceFile = () => {
    setEvidenceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetEvidenceInputs = () => {
    setEvidenceText('')
    setEvidenceUrl('')
    setCodeSnippet('')
    clearEvidenceFile()
  }

  // Quick checks for instant feedback; the server re-checks the file's contents.
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
      addToast({
        type: 'error',
        title: 'File type not allowed',
        message: 'Use an image, PDF, MP4/WebM video, or a .txt, .md or .json file.',
      })
      clearEvidenceFile()
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      addToast({
        type: 'error',
        title: 'File too large',
        message: `Files can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
      })
      clearEvidenceFile()
      return
    }
    setEvidenceFile(file)
  }

  const buildEvidencePayload = async (): Promise<EvidenceInput[]> => {
    const trimmedText = evidenceText.trim()
    const trimmedUrl = evidenceUrl.trim()
    const trimmedCode = codeSnippet.trim()
    const payload: EvidenceInput[] = []

    // Text files are read in full; other files are stored and described.
    if (evidenceFile && isTextUpload(evidenceFile)) {
      payload.push({
        type: 'code',
        content: await evidenceFile.text(),
        metadata: { fileName: evidenceFile.name },
      })
    }

    if (selectedType === 'code') {
      if (trimmedCode) {
        payload.push({
          type: 'code',
          content: trimmedCode,
          metadata: {
            language: codeLanguage.trim() || undefined,
          },
        })
      }

      if (trimmedText) {
        payload.push({
          type: 'text',
          content: `Context for this code submission:\n${trimmedText}`,
        })
      }

      if (trimmedUrl) {
        payload.push({
          type: 'link',
          content:
            trimmedText || `Repository or live proof for ${selectedSkill?.name ?? 'this skill'}`,
          metadata: { url: trimmedUrl },
        })
      }

      return payload
    }

    if (trimmedUrl) {
      payload.push({
        type: 'link',
        content:
          trimmedText ||
          `${selectedEvidenceType.name} evidence for ${selectedSkill?.name ?? 'this skill'}`,
        metadata: { url: trimmedUrl },
      })
    }

    if (trimmedText) {
      payload.push({
        type: 'text',
        content: trimmedText,
      })
    }

    return payload
  }

  const handleAnalyze = async () => {
    if (!user || isGuestPreview) {
      requireAccount()
      return
    }

    if (!selectedSkill) {
      addToast({
        type: 'error',
        title: 'Choose a skill',
        message: 'Select one of your skills before running AI analysis.',
      })
      return
    }

    const trimmedText = evidenceText.trim()
    const trimmedUrl = evidenceUrl.trim()
    const trimmedCode = codeSnippet.trim()

    // A text file is evidence on its own; any other file needs a short
    // description, since the AI judges it by its name and what you say it shows.
    if (evidenceFile && !isTextUpload(evidenceFile) && trimmedText.length < 15) {
      addToast({
        type: 'error',
        title: 'Describe your file',
        message: 'Say what the file shows and what your part in it was.',
      })
      return
    }

    if (!evidenceFile && selectedType === 'code' && trimmedCode.length < 20) {
      addToast({
        type: 'error',
        title: 'Add more code',
        message: 'Paste a real code sample or attach a file so AI has enough proof to assess.',
      })
      return
    }

    if (!evidenceFile && selectedType !== 'code' && trimmedText.length < 30) {
      addToast({
        type: 'error',
        title: 'Add more detail',
        message: 'Give the AI a richer summary of what this evidence proves.',
      })
      return
    }

    if (selectedEvidenceType.needsUrl && !trimmedUrl) {
      addToast({
        type: 'error',
        title: 'Project URL required',
        message: 'Add a live link or repository for project-based verification.',
      })
      return
    }

    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      addToast({
        type: 'error',
        title: 'Invalid URL',
        message: 'Use a full URL that starts with http:// or https://.',
      })
      return
    }

    try {
      setIsSubmitting(true)

      const evidence = await buildEvidencePayload()
      if (evidence.length === 0 && !evidenceFile) {
        addToast({
          type: 'error',
          title: 'Evidence missing',
          message: 'Add enough detail for the analysis to run.',
        })
        return
      }

      // Store the file first. The analysis below then covers it together with
      // everything typed here, as one AI check.
      let evidenceId: string | undefined
      if (evidenceFile) {
        try {
          const upload = await skillsApi.uploadEvidence(selectedSkill.id, evidenceFile, {
            description: trimmedText || undefined,
            verify: false,
          })
          evidenceId = upload.data.id
        } catch (uploadError) {
          addToast({
            type: 'error',
            title: 'File upload failed',
            message:
              uploadError instanceof Error ? uploadError.message : 'The file could not be saved.',
          })
          return
        }
        if (evidence.length === 0) {
          evidence.push({
            type: 'file',
            content: trimmedText,
            metadata: { fileName: evidenceFile.name },
          })
        }
      }

      const response = await aiApi.analyzeEvidence({
        skillId: selectedSkill.id,
        skillName: selectedSkill.name,
        skillLevel: selectedSkill.level,
        evidence,
        evidenceId,
      })

      const savedAnalysis: AnalysisHistoryItem = {
        id: response.data.id,
        skillId: response.data.skillId,
        skillName: response.data.skillName,
        skillLevel: response.data.suggestedLevel ?? selectedSkill.level,
        confidenceScore: response.data.confidenceScore,
        explanation: response.data.explanation,
        suggestedLevel: response.data.suggestedLevel,
        improvements: response.data.improvements,
        tokensUsed: response.data.tokensUsed,
        cost: response.data.cost,
        model: response.data.model,
        verified: response.data.verified,
        createdAt: response.data.createdAt,
      }

      setAnalysisResult(savedAnalysis)
      setRecentAnalyses((prev) =>
        [savedAnalysis, ...prev.filter((item) => item.id !== savedAnalysis.id)].slice(0, 8)
      )
      setSkills((prev) =>
        prev.map((skill) =>
          // The latest analysis decides, so a badge can also be withdrawn.
          skill.id === selectedSkill.id ? { ...skill, verified: response.data.verified } : skill
        )
      )

      if (response.data.verified) {
        setShowConfetti(true)
        window.setTimeout(() => setShowConfetti(false), 2500)
      }

      addToast({
        type: 'success',
        title: response.data.verified ? 'Skill verified' : 'Analysis complete',
        message: response.data.verified
          ? `${selectedSkill.name} now has a verified signal on your profile.`
          : 'AI finished scoring your evidence and saved the result.',
      })

      resetEvidenceInputs()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The AI analysis could not be completed.'

      addToast({
        type: 'error',
        title: 'AI analysis failed',
        message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppPageShell className="min-h-screen bg-black">
      <Confetti trigger={showConfetti} />

      <div className="page-shell">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 md:mb-16"
        >
          <div className="hero-panel p-8 md:p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 border border-white/10 bg-white/5">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="hero-kicker mb-4">AI Trust Engine</div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight leading-[1.1]">
                  AI Verification
                </h1>
                <p className="text-base md:text-lg text-white/68 max-w-2xl">
                  Turn real work into proof. Nexus reviews each skill through one of five pillars so
                  the evidence for code, creative work, communication, leadership, or growth gets
                  scored in the right context.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {['Skill-aware scoring', 'Saved AI feedback', 'Verification-ready trust signals'].map(
                (item) => (
                  <div key={item} className="insight-card px-4 py-3 text-sm text-white/72">
                    {item}
                  </div>
                )
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-6">
              {SKILL_PILLAR_DETAILS.map((pillar) => (
                <div
                  key={pillar.category}
                  className="insight-card px-4 py-4"
                  style={{ borderColor: `${CATEGORY_COLORS[pillar.category]}30` }}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {pillar.shortLabel}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{pillar.category}</div>
                </div>
              ))}
            </div>
            {isGuestPreview && (
              <div className="mt-6 border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-white">
                Guest preview is enabled. You can explore the interface, but running AI verification
                requires a signed-in account.
              </div>
            )}
            {!user && !isLoadingData && (
              <div className="mt-6 border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                Sign in to load your skills and run real AI analyses. Guests can still preview the
                workflow and sample results.
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-6 mb-10 md:mb-16">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <div className="gradient-border-card p-6 text-center">
                  <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{step.step}</div>
                  <h3 className="font-medium text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-white/60">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="gradient-border-card p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Choose Evidence Format</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {evidenceTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        isSelected
                          ? 'border-cyan-300/60 bg-white/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/30'
                      }`}
                    >
                      <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-medium text-white mb-2">{type.name}</h3>
                      <p className="text-sm text-white/60">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="gradient-border-card p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedEvidenceType.name}
                  </h2>
                  <p className="text-white/60">
                    {selectedPillar
                      ? `${selectedEvidenceType.helperText} The AI will apply the ${selectedPillar.category.toLowerCase()} lens to this review.`
                      : selectedEvidenceType.helperText}
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  Gemini
                </Badge>
              </div>

              {selectedPillar && (
                <div
                  className="mb-6 rounded-2xl border p-4"
                  style={{
                    borderColor: `${CATEGORY_COLORS[selectedPillar.category]}45`,
                    backgroundColor: `${CATEGORY_COLORS[selectedPillar.category]}12`,
                  }}
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {selectedPillar.shortLabel}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {selectedPillar.category}
                  </div>
                  <p className="mt-2 text-sm text-white/72">{selectedPillar.summary}</p>
                  <p className="mt-3 text-sm text-white/58">{selectedPillar.proofFocus}</p>
                </div>
              )}

              <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="font-medium text-white mb-3">What strong evidence looks like</h4>
                <ul className="space-y-2">
                  {selectedEvidenceType.requirements.map((requirement) => (
                    <li key={requirement} className="flex items-center gap-2 text-sm text-white/65">
                      <CheckCircle className="w-4 h-4 text-cyan-200" />
                      {requirement}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedEvidenceType.examples.map((example) => (
                    <Badge key={example} variant="default" size="sm">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Skill to verify
                  </label>
                  <select
                    value={selectedSkillId}
                    onChange={(event) => setSelectedSkillId(event.target.value)}
                    disabled={!user || isLoadingData || skills.length === 0}
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition focus:border-cyan-300/60 disabled:opacity-50"
                  >
                    <option value="">
                      {isLoadingData
                        ? 'Loading your skills...'
                        : skills.length > 0
                          ? 'Choose a skill'
                          : user
                            ? 'Add skills first to run verification'
                            : 'Sign in to load your skills'}
                    </option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name} {skill.verified ? '(verified)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedType === 'code' ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Code sample
                      </label>
                      <textarea
                        value={codeSnippet}
                        onChange={(event) => setCodeSnippet(event.target.value)}
                        rows={10}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                        placeholder="Paste the most relevant code, implementation details, or architecture excerpt here."
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">Language</label>
                      <input
                        type="text"
                        value={codeLanguage}
                        onChange={(event) => setCodeLanguage(event.target.value)}
                        className="min-h-[48px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition focus:border-cyan-300/60"
                        placeholder="typescript"
                      />
                    </div>
                  </>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    {selectedEvidenceType.primaryLabel}
                  </label>
                  <textarea
                    value={evidenceText}
                    onChange={(event) => setEvidenceText(event.target.value)}
                    rows={selectedType === 'code' ? 5 : 8}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    placeholder={
                      selectedType === 'code'
                        ? 'Describe the problem solved, your role, architectural choices, and why this proves the skill.'
                        : 'Explain what this evidence shows, what your contribution was, and why it should increase confidence in the selected skill.'
                    }
                  />
                </div>

                {selectedEvidenceType.supportsUrl && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      {selectedEvidenceType.needsUrl
                        ? 'Live URL or repository'
                        : 'Optional supporting URL'}
                    </label>
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                      className="min-h-[48px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition focus:border-cyan-300/60"
                      placeholder="https://github.com/your-project or https://your-demo.com"
                    />
                  </div>
                )}

                <div>
                  <span className="mb-2 block text-sm font-medium text-white">
                    Attach a file (optional)
                  </span>
                  <input
                    ref={fileInputRef}
                    id="evidence-file"
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />
                  {evidenceFile ? (
                    <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.06] px-4">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-white">
                        <File className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />
                        <span className="truncate">{evidenceFile.name}</span>
                        <span className="shrink-0 text-white/45">
                          {evidenceFile.size < 1024 * 1024
                            ? `${Math.max(1, Math.round(evidenceFile.size / 1024))}KB`
                            : `${(evidenceFile.size / 1024 / 1024).toFixed(1)}MB`}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={clearEvidenceFile}
                        disabled={isSubmitting}
                        aria-label={`Remove ${evidenceFile.name}`}
                        className="rounded-lg p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="evidence-file"
                      className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/40 px-4 text-sm text-white/70 transition hover:border-cyan-300/50 hover:text-white peer-focus-visible:border-cyan-300 peer-focus-visible:text-white"
                    >
                      <Upload className="h-4 w-4" aria-hidden />
                      Choose a file
                    </label>
                  )}
                  <p className="mt-2 text-xs text-white/45">
                    Images, PDF, MP4/WebM video, or .txt, .md and .json, up to{' '}
                    {MAX_UPLOAD_BYTES / 1024 / 1024}MB. The AI reads text files in full; for other
                    files it relies on the file name and your description above.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleAnalyze}
                  isLoading={isSubmitting}
                  leftIcon={<Brain className="w-5 h-5" />}
                  disabled={isLoadingData}
                >
                  {isSubmitting ? 'Analyzing with AI...' : 'Run AI Analysis'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetEvidenceInputs}
                  leftIcon={<RefreshCw className="w-5 h-5" />}
                  disabled={isSubmitting}
                >
                  Clear Inputs
                </Button>
              </div>

              {!user && (
                <p className="mt-4 text-sm text-white/55">
                  You can explore the workflow here. Sign in to load real skills and save actual
                  verification results.
                </p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {analysisResult && (
                <motion.div
                  key={analysisResult.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="gradient-border-card p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="hero-kicker mb-3">Latest result</div>
                      <h2 className="text-2xl font-bold text-white">{analysisResult.skillName}</h2>
                      <p className="text-white/60 mt-2">
                        AI analyzed your evidence and saved the result to your profile history.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={analysisResult.verified ? 'success' : 'info'} size="sm">
                        {analysisResult.verified ? 'Verified signal earned' : 'Analysis saved'}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {analysisResult.model}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="insight-card p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Confidence
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {formatConfidence(analysisResult.confidenceScore)}
                      </div>
                    </div>
                    <div className="insight-card p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Suggested level
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white capitalize">
                        {analysisResult.suggestedLevel ?? selectedSkill?.level ?? 'unchanged'}
                      </div>
                    </div>
                    <div className="insight-card p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Estimated cost
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        ${Number(analysisResult.cost ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45 mb-3">
                      Why the AI scored it this way
                    </h3>
                    <p className="text-white/78 leading-relaxed">{analysisResult.explanation}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45 mb-3">
                      How to strengthen this claim
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.improvements.map((improvement) => (
                        <div key={improvement} className="flex items-start gap-3 text-white/78">
                          <TrendingUp className="mt-0.5 h-4 w-4 text-cyan-200" />
                          <span>{improvement}</span>
                        </div>
                      ))}
                      {analysisResult.improvements.length === 0 && (
                        <p className="text-white/60">
                          The current evidence already looks strong, so no major follow-up
                          suggestions were returned.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <div className="gradient-border-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-white" />
                <div>
                  <h3 className="font-medium text-white">Verification Stats</h3>
                  <p className="text-sm text-white/60">Based on saved AI analyses</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2 text-white">
                    <span>Verified rate</span>
                    <span className="font-medium">{stats.verifiedRate}%</span>
                  </div>
                  <div className="h-2 bg-white/10 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${stats.verifiedRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 text-white">
                    <span>Average confidence</span>
                    <span className="font-medium">{stats.avgConfidence}%</span>
                  </div>
                  <div className="h-2 bg-white/10 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-cyan-200 rounded-full"
                      style={{ width: `${stats.avgConfidence}%` }}
                    />
                  </div>
                </div>
                <div className="insight-card p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Saved analyses
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{stats.total}</div>
                </div>
              </div>
            </div>

            <div className="gradient-border-card p-6">
              <h3 className="text-lg font-bold text-white mb-6">
                {isGuestPreview ? 'Preview Results' : 'Recent AI Analyses'}
              </h3>
              <div className="space-y-4">
                {displayedAnalyses.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                    No saved analyses yet. Run your first AI verification to start building trust
                    signals.
                  </div>
                )}

                {displayedAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-medium text-white">{analysis.skillName}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45 mt-1">
                          {getSkillPillarForName(analysis.skillName).category}
                        </div>
                        <div className="text-xs text-white/50">
                          {formatRelativeTime(analysis.createdAt)}
                        </div>
                      </div>
                      <Badge variant={analysis.verified ? 'success' : 'info'} size="sm">
                        {formatConfidence(analysis.confidenceScore)}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/65 leading-relaxed mb-3">
                      {analysis.explanation}
                    </p>
                    <div className="space-y-2">
                      {analysis.improvements.slice(0, 2).map((improvement) => (
                        <div
                          key={improvement}
                          className="flex items-start gap-2 text-sm text-white/60"
                        >
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 text-cyan-200" />
                          <span>{improvement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gradient-border-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-white" />
                <div>
                  <h3 className="font-medium text-white">What&apos;s Next</h3>
                  <p className="text-sm text-white/60">Best follow-up AI features for Nexus</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  AI-generated verification challenges for skills without existing artifacts.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  Smarter evidence extraction from uploaded files, repos, and live project URLs.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  Profile-wide recommendations that tell users which proof would move their passport
                  the most.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppPageShell>
  )
}
