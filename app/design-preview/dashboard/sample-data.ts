import type { HeatmapColumn } from '@/components/charts/heatmap'

/**
 * Sample data for the dashboard layout preview. Shapes follow what the real
 * dashboard can load (skills, verification history, activity), so whichever
 * layout is picked can be wired to live data without changing the charts.
 */

export const TODAY = new Date(2026, 9, 22)

export type SampleSkill = {
  name: string
  pillar: 'Build' | 'Create' | 'Explain' | 'Lead' | 'Grow'
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  status: 'verified' | 'not-yet' | 'unchecked'
  /** Latest AI confidence, 0–100. Null when the skill has never been checked. */
  confidence: number | null
  lastChecked: string | null
  /** Confidence of each check, oldest first. */
  history: number[]
}

export const SKILLS: SampleSkill[] = [
  {
    name: 'React',
    pillar: 'Build',
    level: 'Advanced',
    status: 'verified',
    confidence: 86,
    lastChecked: '3 days ago',
    history: [58, 64, 71, 79, 86],
  },
  {
    name: 'TypeScript',
    pillar: 'Build',
    level: 'Advanced',
    status: 'verified',
    confidence: 81,
    lastChecked: '1 week ago',
    history: [62, 70, 81],
  },
  {
    name: 'Writing',
    pillar: 'Explain',
    level: 'Intermediate',
    status: 'verified',
    confidence: 74,
    lastChecked: '2 weeks ago',
    history: [66, 74],
  },
  {
    name: 'UI design',
    pillar: 'Create',
    level: 'Intermediate',
    status: 'verified',
    confidence: 77,
    lastChecked: '3 weeks ago',
    history: [51, 69, 77],
  },
  {
    name: 'SQL',
    pillar: 'Build',
    level: 'Intermediate',
    status: 'not-yet',
    confidence: 58,
    lastChecked: '5 days ago',
    history: [41, 52, 58],
  },
  {
    name: 'Speaking',
    pillar: 'Explain',
    level: 'Beginner',
    status: 'not-yet',
    confidence: 44,
    lastChecked: '1 month ago',
    history: [44],
  },
  {
    name: 'Mentoring',
    pillar: 'Lead',
    level: 'Beginner',
    status: 'unchecked',
    confidence: null,
    lastChecked: null,
    history: [],
  },
]

export const NEXT_STEP = {
  skill: 'SQL',
  action: 'Add a query you wrote and the data it ran on',
  reason:
    'The last check found the claim but no work behind it. One real query with its result is usually enough to clear Intermediate.',
}

export const OTHER_STEPS = [
  { skill: 'Mentoring', action: 'Run a first check with a short write-up of who you mentored' },
  { skill: 'Speaking', action: 'Add a recording of a talk or demo, two minutes is enough' },
]

export const RECENT_CHECKS = [
  { skill: 'React', result: 'Verified', confidence: 86, when: '3 days ago' },
  { skill: 'SQL', result: 'Not verified yet', confidence: 58, when: '5 days ago' },
  { skill: 'TypeScript', result: 'Verified', confidence: 81, when: '1 week ago' },
  { skill: 'Writing', result: 'Verified', confidence: 74, when: '2 weeks ago' },
]

/** Verified skills at the end of each week, last 12 weeks. */
export const VERIFIED_OVER_TIME = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4].map((verified, i) => ({
  date: new Date(TODAY.getTime() - (11 - i) * 7 * 86_400_000),
  verified,
}))

/** Average confidence of the checks run each week, last 12 weeks. */
export const CONFIDENCE_OVER_TIME = [48, 52, 51, 58, 61, 60, 66, 69, 71, 70, 76, 79].map(
  (confidence, i) => ({
    date: new Date(TODAY.getTime() - (11 - i) * 7 * 86_400_000),
    confidence,
  })
)

/** Verified share per pillar, for the ring chart. */
export const PILLARS = (['Build', 'Create', 'Explain', 'Lead', 'Grow'] as const).map((pillar) => {
  const inPillar = SKILLS.filter((s) => s.pillar === pillar)
  return {
    label: pillar,
    value: inPillar.filter((s) => s.status === 'verified').length,
    // The ring needs a non-zero maximum; `claimed` keeps the true count for labels.
    maxValue: Math.max(inPillar.length, 1),
    claimed: inPillar.length,
  }
})

/** Latest confidence per checked skill, split so verified and not-yet bars take different colours. */
export const CONFIDENCE_BY_SKILL = SKILLS.filter((s) => s.confidence !== null).map((s) => ({
  skill: s.name,
  verified: s.status === 'verified' ? (s.confidence ?? 0) : 0,
  notYet: s.status === 'not-yet' ? (s.confidence ?? 0) : 0,
}))

/** Checks and proof added per day over the last 26 weeks (seeded, so SSR and client agree). */
export function activityCalendar(weeks = 26): { columns: HeatmapColumn[]; domain: [Date, Date] } {
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const end = new Date(TODAY)
  const firstSunday = new Date(end)
  firstSunday.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7)

  const columns: HeatmapColumn[] = []
  for (let week = 0; week < weeks; week++) {
    const bins = []
    for (let day = 0; day < 7; day++) {
      const date = new Date(firstSunday)
      date.setDate(firstSunday.getDate() + week * 7 + day)
      // Activity builds up over the period, with quiet weekends.
      const busy = day === 0 || day === 6 ? 0.06 : 0.08 + (week / weeks) * 0.55
      const count = random() < busy ? Math.ceil(random() * 4) : 0
      bins.push({ bin: day, count, date })
    }
    columns.push({ bin: week, bins })
  }

  return { columns, domain: [firstSunday, end] }
}
