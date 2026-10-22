'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { File, Upload, X } from 'lucide-react'
import Button from '@/components/UI/Button'
import { useToast } from '@/components/UI/ToastProvider'
import { aiApi, authApi, skillsApi } from '@/lib/api'
import type { AnalysisHistoryItem, EvidenceInput } from '@/lib/api/ai'
import type { Skill, User } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { getSkillPillarDetail, getSkillPillarForName } from '@/lib/skills-taxonomy'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
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
  shortName: string
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
    shortName: 'Code',
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
    shortName: 'Video',
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
    shortName: 'Document',
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
    shortName: 'Audio',
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
    shortName: 'Project',
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
        // The dashboard's next step links here with ?skill=<id>.
        const requested = new URLSearchParams(window.location.search).get('skill')
        const initial = skillData.find((skill) => skill.id === requested) ?? skillData[0]
        setSelectedSkillId((prev) => prev || initial?.id || '')
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

  const level = (value: string | null | undefined) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : ''

  // Visitors who can't run a check see a labelled sample of what one returns.
  const isSampleResult = !analysisResult && !isLoadingData && (!user || isGuestPreview)
  const shownResult = analysisResult ?? (isSampleResult ? guestSampleAnalyses[0] : null)
  const claimedLevel = isSampleResult ? shownResult?.skillLevel : selectedSkill?.level

  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Verification"
          rule
          description="Add work that shows the skill. The AI checks it against the level you claim and tells you why."
        />

        {!isLoadingData && (!user || isGuestPreview) && (
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
            <p className="text-sm text-ink-muted">
              {isGuestPreview
                ? 'You are viewing sample results. Running a check needs an account.'
                : 'You are viewing sample results. Sign in to check your own skills.'}
            </p>
            <Link
              href={isGuestPreview ? '/auth/register' : '/auth/login?next=/verification'}
              className="pill"
              data-active="true"
            >
              {isGuestPreview ? 'Create account' : 'Sign in'}
            </Link>
          </div>
        )}

        {/* Skill picker */}
        <section aria-labelledby="skill-heading" className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="skill-heading" className="text-sm font-normal text-ink-muted">
              Skill
            </h2>
            {user && !isGuestPreview && (
              <Link href="/skills" className="text-sm text-ink-muted hover:text-ink">
                Manage skills
              </Link>
            )}
          </div>
          {isLoadingData ? (
            <div className="flex gap-2" aria-hidden>
              {[96, 132, 110].map((w) => (
                <span
                  key={w}
                  className="h-8 animate-pulse rounded-full bg-pill"
                  style={{ width: w }}
                />
              ))}
            </div>
          ) : skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="pill"
                  aria-pressed={skill.id === selectedSkillId}
                  onClick={() => setSelectedSkillId(skill.id)}
                >
                  {skill.verified && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-verified"
                      aria-label="Verified"
                      role="img"
                    />
                  )}
                  {skill.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-ink-muted">
              {user ? (
                <>
                  You have no skills yet.{' '}
                  <Link href="/skills" className="metalab-link">
                    Add your first skill
                  </Link>{' '}
                  to check it.
                </>
              ) : (
                'Your skills appear here once you sign in.'
              )}
            </p>
          )}

          {selectedSkill && (
            <div className="mt-8 grid gap-4 border-t border-line pt-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:gap-10">
              <div>
                <p className="text-lg text-ink">{selectedSkill.name}</p>
                <p className="mt-1 text-sm text-ink-faint">{selectedPillar?.category}</p>
              </div>
              <p className="max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                {selectedPillar?.proofFocus}
              </p>
              <dl className="flex gap-8 text-sm md:flex-col md:gap-1 md:text-right">
                <div>
                  <dt className="sr-only">Claimed level</dt>
                  <dd className="text-ink">{level(selectedSkill.level)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Status</dt>
                  <dd className={selectedSkill.verified ? 'text-verified-ink' : 'text-ink-faint'}>
                    {selectedSkill.verified ? 'Verified' : 'Not verified yet'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          {/* Evidence */}
          <section aria-labelledby="evidence-heading" className="min-w-0">
            <h2 id="evidence-heading" className="mb-4 text-sm font-normal text-ink-muted">
              Evidence
            </h2>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Evidence type">
              {evidenceTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className="pill"
                  aria-pressed={selectedType === type.id}
                  onClick={() => setSelectedType(type.id)}
                >
                  {type.shortName}
                </button>
              ))}
            </div>
            <p className="mb-8 max-w-[60ch] text-[0.9375rem] text-ink-muted">
              {selectedEvidenceType.description}
            </p>

            <div className="grid gap-6">
              {selectedType === 'code' && (
                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div className="sm:col-span-2">
                    <label htmlFor="code-sample" className="metalab-label">
                      Code sample
                    </label>
                    <textarea
                      id="code-sample"
                      value={codeSnippet}
                      onChange={(event) => setCodeSnippet(event.target.value)}
                      rows={10}
                      spellCheck={false}
                      className="metalab-input font-mono text-[0.8125rem] leading-relaxed"
                      placeholder="Paste the code that best shows the skill."
                    />
                  </div>
                  <div>
                    <label htmlFor="code-language" className="metalab-label">
                      Language
                    </label>
                    <input
                      id="code-language"
                      type="text"
                      value={codeLanguage}
                      onChange={(event) => setCodeLanguage(event.target.value)}
                      className="metalab-input"
                      placeholder="typescript"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="evidence-text" className="metalab-label">
                  {selectedType === 'code'
                    ? 'What it does and your part in it'
                    : selectedEvidenceType.primaryLabel}
                </label>
                <textarea
                  id="evidence-text"
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  rows={selectedType === 'code' ? 4 : 7}
                  className="metalab-input leading-relaxed"
                  placeholder={
                    selectedType === 'code'
                      ? 'The problem it solves, what you built, and which parts were yours.'
                      : selectedEvidenceType.helperText
                  }
                />
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-faint">
                  {selectedEvidenceType.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>

              {selectedEvidenceType.supportsUrl && (
                <div>
                  <label htmlFor="evidence-url" className="metalab-label">
                    {selectedEvidenceType.needsUrl ? 'Live link or repository' : 'Link (optional)'}
                  </label>
                  <input
                    id="evidence-url"
                    type="url"
                    value={evidenceUrl}
                    onChange={(event) => setEvidenceUrl(event.target.value)}
                    className="metalab-input"
                    placeholder="https://github.com/you/project"
                  />
                  <p className="mt-2 text-sm text-ink-faint">
                    GitHub repositories count as your work when your linked GitHub account
                    contributed to them.
                  </p>
                </div>
              )}

              <div>
                <span className="metalab-label">File (optional)</span>
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
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-raised px-4">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                      <File className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                      <span className="truncate">{evidenceFile.name}</span>
                      <span className="shrink-0 text-ink-faint tabular">
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
                      className="rounded-full p-1.5 text-ink-muted transition-colors duration-150 hover:bg-pill hover:text-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="evidence-file"
                    className="pill cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--verified)]"
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    Choose a file
                  </label>
                )}
                <p className="mt-2 text-sm text-ink-faint">
                  Images, PDF, MP4 or WebM video, or .txt, .md and .json up to{' '}
                  {MAX_UPLOAD_BYTES / 1024 / 1024}MB. Text files are read in full; other files are
                  judged by their name and your description.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2">
              <Button onClick={handleAnalyze} isLoading={isSubmitting} disabled={isLoadingData}>
                {isSubmitting ? 'Checking your evidence' : 'Run AI check'}
              </Button>
              <Button variant="ghost" onClick={resetEvidenceInputs} disabled={isSubmitting}>
                Clear
              </Button>
            </div>
          </section>

          {/* Result */}
          <section
            aria-labelledby="result-heading"
            aria-live="polite"
            className="min-w-0 lg:sticky lg:top-24 lg:self-start"
          >
            <h2 id="result-heading" className="mb-4 text-sm font-normal text-ink-muted">
              {isSampleResult ? 'Sample result' : 'Result'}
            </h2>
            {shownResult ? (
              <div key={shownResult.id} className="page-enter">
                <div className="flex items-end gap-5 border-b border-line pb-6">
                  <p className="leading-none">
                    <span className="display-number text-score">
                      {Math.round(shownResult.confidenceScore * 100)}
                    </span>
                    <span className="display-number text-4xl text-ink-muted">%</span>
                    <span className="sr-only"> confidence</span>
                  </p>
                  <div className="pb-2 text-sm">
                    <p
                      className={
                        shownResult.verified
                          ? 'flex items-center gap-2 text-verified-ink'
                          : 'text-ink'
                      }
                    >
                      {shownResult.verified && (
                        <span className="h-1.5 w-1.5 rounded-full bg-verified" aria-hidden />
                      )}
                      {shownResult.verified ? 'Verified' : 'Not verified yet'}
                    </p>
                    <p className="mt-1 text-ink-faint">
                      {shownResult.suggestedLevel && shownResult.suggestedLevel !== claimedLevel
                        ? `Evidence supports ${level(shownResult.suggestedLevel)}`
                        : `At ${level(claimedLevel ?? shownResult.skillLevel)}`}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink">
                  {shownResult.explanation}
                </p>

                <h3 className="mt-8 text-sm font-normal text-ink-muted">
                  To strengthen this claim
                </h3>
                {shownResult.improvements.length > 0 ? (
                  <ul className="ruled-list mt-3 border-y border-line">
                    {shownResult.improvements.map((improvement) => (
                      <li key={improvement} className="py-3 text-[0.9375rem] text-ink">
                        {improvement}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[0.9375rem] text-ink-muted">
                    Nothing to add: the evidence already supports this claim.
                  </p>
                )}
              </div>
            ) : (
              <div className="border-y border-line py-8">
                <p className="display-number text-6xl text-ink-faint" aria-hidden>
                  —
                </p>
                <p className="mt-6 max-w-[38ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                  Run a check to see your confidence score, the reasons behind it, and what would
                  raise it. A skill is verified at 80% when the evidence supports the level you
                  claim.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* History */}
        <section aria-labelledby="history-heading" className="mt-24">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="history-heading" className="text-2xl font-normal">
              {isGuestPreview || !user ? 'Sample checks' : 'Recent checks'}
            </h2>
            {stats.total > 0 && (
              <p className="text-sm text-ink-faint tabular">
                {stats.total} saved · {stats.verifiedRate}% verified · average confidence{' '}
                {stats.avgConfidence}%
              </p>
            )}
          </div>

          {displayedAnalyses.length === 0 ? (
            <p className="border-t border-line pt-6 text-ink-muted">
              No checks yet. Your first result will appear here.
            </p>
          ) : (
            <ul className="ruled-list border-y border-line">
              {displayedAnalyses.map((analysis) => (
                <li
                  key={analysis.id}
                  className="grid gap-3 py-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem] md:gap-10"
                >
                  <div>
                    <p className="text-ink">{analysis.skillName}</p>
                    <p className="mt-1 text-sm text-ink-faint">
                      {getSkillPillarForName(analysis.skillName).category} ·{' '}
                      {formatRelativeTime(analysis.createdAt)}
                    </p>
                  </div>
                  <p className="line-clamp-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                    {analysis.explanation}
                  </p>
                  <div className="flex items-baseline gap-3 md:justify-end">
                    <span className="display-number text-4xl leading-none">
                      {Math.round(analysis.confidenceScore * 100)}
                      <span className="text-xl text-ink-muted">%</span>
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        analysis.verified ? 'bg-verified' : 'bg-ink-faint'
                      }`}
                      role="img"
                      aria-label={analysis.verified ? 'Verified' : 'Not verified'}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppPageShell>
  )
}
