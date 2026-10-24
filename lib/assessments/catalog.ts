/**
 * The skills Nexus can assess today. Each entry ties a skill to one
 * challenge, a workspace and a versioned rubric. Adding a skill means adding
 * a challenge module and an entry here; the attempt lifecycle, grading and
 * credentials are shared.
 */

import type { SkillCategory } from '@/lib/types'
import type { AssessmentMode, CodeLanguage, Rubric, WorkspaceKind } from './types'
import { CODE_RUBRIC } from './challenges/ledger'
import { SQL_RUBRIC } from './challenges/sales'
import { WRITING_RUBRIC } from './challenges/client-email'
import { judge0Configured } from './runners/judge0'

export interface AssessmentDefinition {
  slug: string
  skillName: string
  /** Matches the skill taxonomy pillar names used elsewhere in Nexus. */
  category: SkillCategory
  workspace: WorkspaceKind
  language?: CodeLanguage | 'sql'
  challengeId: string
  challengeVersion: number
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
  requires?: 'judge0'
}

const CODE_MEASURES = [
  'Working code against hidden tests generated for your attempt',
  'Handling of malformed input and boundaries',
  'Changing your solution when the requirement changes',
  'Explaining your own code',
]

export const ASSESSMENTS: AssessmentDefinition[] = [
  {
    slug: 'javascript',
    skillName: 'JavaScript',
    category: 'Technical Skills',
    workspace: 'code',
    language: 'javascript',
    challengeId: 'ledger-summary',
    challengeVersion: 1,
    title: 'Ledger summary in JavaScript',
    level: 'Working level',
    summary:
      'Turn messy transaction records into account balances, then adapt your code to a new rule.',
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
    challengeId: 'ledger-summary',
    challengeVersion: 1,
    title: 'Ledger summary in TypeScript',
    level: 'Working level',
    summary: 'The ledger challenge with types: model the input safely, then adapt to a new rule.',
    measures: CODE_MEASURES,
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: CODE_RUBRIC,
    credentialValidMonths: 24,
  },
  {
    slug: 'python',
    skillName: 'Python',
    category: 'Technical Skills',
    workspace: 'code',
    language: 'python',
    challengeId: 'ledger-summary',
    challengeVersion: 1,
    title: 'Ledger summary in Python',
    level: 'Working level',
    summary:
      'Turn messy transaction records into account balances in Python, then adapt to a new rule.',
    measures: CODE_MEASURES,
    stageMinutes: { main: 25, followup: 10, explain: 10 },
    modes: ['independent', 'ai_assisted'],
    rubric: CODE_RUBRIC,
    credentialValidMonths: 24,
    requires: 'judge0',
  },
  {
    slug: 'sql',
    skillName: 'SQL',
    category: 'Technical Skills',
    workspace: 'sql',
    language: 'sql',
    challengeId: 'sales-cleanup',
    challengeVersion: 1,
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
    challengeId: 'project-delay-email',
    challengeVersion: 1,
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

export function totalMinutes(def: AssessmentDefinition): number {
  return def.stageMinutes.main + def.stageMinutes.followup + def.stageMinutes.explain
}

/** Whether every runner this assessment needs is switched on. */
export function isAvailable(def: AssessmentDefinition): boolean {
  if (def.requires === 'judge0') return judge0Configured()
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
