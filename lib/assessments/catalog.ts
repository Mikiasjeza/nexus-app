/**
 * The skills Nexus can assess today. Each entry ties a skill to a pool of
 * challenges, a workspace and a versioned rubric; every attempt draws one
 * challenge from the pool. Adding a skill means adding challenge modules and
 * an entry here; the attempt lifecycle, grading and credentials are shared.
 */

import type { SkillCategory } from '@/lib/types'
import type { AssessmentMode, CodeLanguage, Rubric, WorkspaceKind } from './types'
import { CODE_RUBRIC } from './challenges/code'
import { CODE_CHALLENGES } from './challenges'
import { SQL_RUBRIC } from './challenges/sales'
import { WRITING_RUBRIC } from './challenges/client-email'
import { judge0Configured } from './runners/judge0'
import { devPythonEnabled } from './runners/pyodide-dev'

export interface AssessmentDefinition {
  slug: string
  skillName: string
  /** Matches the skill taxonomy pillar names used elsewhere in Nexus. */
  category: SkillCategory
  workspace: WorkspaceKind
  language?: CodeLanguage | 'sql'
  /** The challenges an attempt can draw; more than one keeps leaks contained. */
  challengeIds: string[]
  title: string
  /** Plain level name. Nexus never claims "expert" from one assessment. */
  level: string
  summary: string
  measures: string[]
  /** Suggested minutes per stage; the attempt deadline is their sum. */
  stageMinutes: { main: number; followup: number; explain: number }
  modes: AssessmentMode[]
  rubric: Rubric
  credentialValidMonths: number
  /** A runner that must be configured before the assessment can be taken. */
  requires?: 'python-runner'
}

const CODE_MEASURES = [
  'Working code against hidden tests generated for your attempt',
  'Handling of malformed input and boundaries',
  'Changing your solution when the requirement changes',
  'Explaining your own code',
]

const CODE_POOL = Object.keys(CODE_CHALLENGES)

export const ASSESSMENTS: AssessmentDefinition[] = [
  {
    slug: 'python',
    skillName: 'Python',
    category: 'Technical Skills',
    workspace: 'code',
    language: 'python',
    challengeIds: CODE_POOL,
    title: 'Practical Python',
    level: 'Working level',
    summary:
      'Write a Python function that turns messy real-world data into clean results, then change it when the requirement changes.',
    measures: CODE_MEASURES,
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: CODE_RUBRIC,
    credentialValidMonths: 24,
    requires: 'python-runner',
  },
  {
    slug: 'javascript',
    skillName: 'JavaScript',
    category: 'Technical Skills',
    workspace: 'code',
    language: 'javascript',
    challengeIds: CODE_POOL,
    title: 'Practical JavaScript',
    level: 'Working level',
    summary:
      'Write a JavaScript function that turns messy real-world data into clean results, then change it when the requirement changes.',
    measures: CODE_MEASURES,
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: CODE_RUBRIC,
    credentialValidMonths: 24,
  },
  {
    slug: 'typescript',
    skillName: 'TypeScript',
    category: 'Technical Skills',
    workspace: 'code',
    language: 'typescript',
    challengeIds: CODE_POOL,
    title: 'Practical TypeScript',
    level: 'Working level',
    summary:
      'Model messy input safely with types, turn it into clean results, then change your code when the requirement changes.',
    measures: CODE_MEASURES,
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: CODE_RUBRIC,
    credentialValidMonths: 24,
  },
  {
    slug: 'sql',
    skillName: 'SQL',
    category: 'Technical Skills',
    workspace: 'sql',
    language: 'sql',
    challengeIds: ['sales-cleanup'],
    title: 'Sales cleanup in SQL',
    level: 'Working level',
    summary:
      'Answer revenue questions from a messy export, survive a newer export, and recommend a next step.',
    measures: [
      'Correct results with duplicates, missing values and refunds in the data',
      'Queries that still hold on a newer export',
      'Reading the results and recommending an action',
      'Explaining how you handled the data',
    ],
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: SQL_RUBRIC,
    credentialValidMonths: 24,
  },
  {
    slug: 'business-writing',
    skillName: 'Business Writing',
    category: 'Communication Skills',
    workspace: 'writing',
    challengeIds: ['project-delay-email'],
    title: 'Project delay email',
    level: 'Working level',
    summary:
      'Tell a client their project is late, then revise when they push back with a hard constraint.',
    measures: [
      'Getting every key fact right',
      'Clear structure with the main point first',
      'An honest, professional tone with a client',
      'Revising accurately when new information arrives',
    ],
    stageMinutes: { main: 15, followup: 10, explain: 5 },
    modes: ['independent', 'ai_assisted'],
    rubric: WRITING_RUBRIC,
    credentialValidMonths: 24,
  },
]

export function getAssessment(slug: string): AssessmentDefinition | undefined {
  return ASSESSMENTS.find((a) => a.slug === slug)
}

/** Version of a challenge, recorded on attempts and credentials. */
export function challengeVersion(challengeId: string): number {
  return CODE_CHALLENGES[challengeId]?.version ?? 1
}

/**
 * The challenge for a new attempt: drawn by seed, avoiding ones this
 * candidate already had where the pool allows.
 */
export function pickChallenge(
  def: AssessmentDefinition,
  seed: number,
  avoid: string[] = []
): string {
  const fresh = def.challengeIds.filter((id) => !avoid.includes(id))
  const pool = fresh.length > 0 ? fresh : def.challengeIds
  return pool[seed % pool.length]
}

export function totalMinutes(def: AssessmentDefinition): number {
  return def.stageMinutes.main + def.stageMinutes.followup + def.stageMinutes.explain
}

/** Whether every runner this assessment needs is switched on. */
export function isAvailable(def: AssessmentDefinition): boolean {
  if (def.requires === 'python-runner') return judge0Configured() || devPythonEnabled()
  return true
}

export const MODE_LABELS: Record<AssessmentMode, string> = {
  independent: 'Independent',
  ai_assisted: 'AI-assisted',
}

export const MODE_DESCRIPTIONS: Record<AssessmentMode, string> = {
  independent:
    'Your own work only: no AI tools, no copying from other sources. The credential says Independent.',
  ai_assisted:
    'You may use AI tools, as you would at work. You still have to explain your choices. The credential says AI-assisted.',
}

/** Retake rules, shared by the API and the detail page. */
export const RETAKE_POLICY = {
  /** Wait after a result that did not pass. */
  cooldownHours: 24,
  /** Attempts per skill in a rolling window. */
  maxAttempts: 3,
  windowDays: 30,
}

export const ASSESSMENT_RULES = [
  'One sitting. The timer keeps running if you close the tab, and your work saves as you go.',
  'Three steps: the task, a follow-up that changes the requirement, and short questions about your own work.',
  'Each step locks when you submit it. You cannot go back.',
  'We record pastes, tab switches and timing to support the result. They never fail you on their own; unusual patterns are looked at by a person.',
  'Hidden checks are generated for your attempt only. Sharing a task does not help anyone else.',
]
