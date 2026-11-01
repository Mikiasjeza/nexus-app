import {
  buildDashboardSummary,
  verifiedChangesFromHistory,
  type DashboardInput,
} from '@/lib/dashboard/summary'

const NOW = new Date('2026-10-22T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000)

function input(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return { now: NOW, skills: [], analyses: [], verifiedChanges: [], activities: [], ...overrides }
}

const react = {
  id: 'react',
  name: 'React',
  category: 'Technical Skills',
  verified: true,
  createdAt: daysAgo(120),
}
const sql = {
  id: 'sql',
  name: 'SQL',
  category: 'Technical Skills',
  verified: false,
  createdAt: daysAgo(60),
}
const mentoring = {
  id: 'mentoring',
  name: 'Mentoring',
  category: 'Professional Skills',
  verified: false,
  createdAt: daysAgo(5),
}

describe('buildDashboardSummary next steps', () => {
  it('asks for a first skill when there are none', () => {
    const { steps } = buildDashboardSummary(input())
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ kind: 'add-skill', action: { href: '/skills' } })
  })

  it('leads with the AI suggestion from the latest failed check', () => {
    const { steps } = buildDashboardSummary(
      input({
        skills: [react, sql],
        analyses: [
          {
            id: 'a1',
            skillId: 'sql',
            confidenceScore: 0.58,
            improvements: ['add a query you wrote and the data it ran on'],
            createdAt: daysAgo(5),
          },
        ],
      })
    )
    expect(steps[0]).toMatchObject({
      kind: 'add-proof',
      skillId: 'sql',
      title: 'Add proof to SQL',
      lead: 'Add a query you wrote and the data it ran on.',
      action: { href: '/verification?skill=sql' },
    })
    expect(steps[0].detail).toContain('58%')
  })

  it('puts failed checks before never-checked skills and caps the list at three', () => {
    const extra = [1, 2, 3].map((n) => ({ ...mentoring, id: `m${n}`, name: `Skill ${n}` }))
    const { steps } = buildDashboardSummary(
      input({
        skills: [sql, ...extra],
        analyses: [
          {
            id: 'a1',
            skillId: 'sql',
            confidenceScore: 0.4,
            improvements: [],
            createdAt: daysAgo(1),
          },
        ],
      })
    )
    expect(steps.map((step) => step.kind)).toEqual(['add-proof', 'first-check', 'first-check'])
    expect(steps[0].lead).toBeUndefined()
  })

  it('suggests sharing once everything is verified', () => {
    const { steps } = buildDashboardSummary(input({ skills: [react] }))
    expect(steps).toEqual([expect.objectContaining({ kind: 'share' })])
  })
})

describe('buildDashboardSummary history', () => {
  it('replays verified flips backwards from today', () => {
    const { verifiedOverTime, totals } = buildDashboardSummary(
      input({
        skills: [react, { ...sql, verified: true }],
        verifiedChanges: [
          { skillId: 'react', timestamp: daysAgo(50), oldValue: false, newValue: true },
          { skillId: 'sql', timestamp: daysAgo(10), oldValue: false, newValue: true },
        ],
      })
    )
    expect(totals).toEqual({ claimed: 2, verified: 2 })
    expect(verifiedOverTime).toHaveLength(12)
    // 77 days ago: neither flip had happened yet.
    expect(verifiedOverTime[0].verified).toBe(0)
    // 49 days ago: React verified, SQL not yet.
    expect(verifiedOverTime[4].verified).toBe(1)
    expect(verifiedOverTime[11].verified).toBe(2)
  })

  it('gives each recent check the verdict it produced, not the current one', () => {
    const { recentChecks } = buildDashboardSummary(
      input({
        skills: [react],
        analyses: [
          {
            id: 'pass',
            skillId: 'react',
            confidenceScore: 0.84,
            improvements: [],
            createdAt: daysAgo(3),
          },
          {
            id: 'fail',
            skillId: 'react',
            confidenceScore: 0.6,
            improvements: [],
            createdAt: daysAgo(30),
          },
        ],
        verifiedChanges: [
          { skillId: 'react', timestamp: daysAgo(3), oldValue: false, newValue: true },
        ],
      })
    )
    expect(recentChecks.map((check) => [check.id, check.verified, check.confidence])).toEqual([
      ['pass', true, 84],
      ['fail', false, 60],
    ])
  })

  it('counts a check and the activity it logged once', () => {
    const checkTime = daysAgo(3)
    const { activity } = buildDashboardSummary(
      input({
        skills: [react],
        analyses: [
          {
            id: 'a1',
            skillId: 'react',
            confidenceScore: 0.8,
            improvements: [],
            createdAt: checkTime,
          },
        ],
        activities: [
          { skillId: 'react', timestamp: new Date(checkTime.getTime() + 200) },
          { skillId: 'react', timestamp: daysAgo(40) },
          { skillId: null, timestamp: daysAgo(500) },
        ],
      })
    )
    expect(activity).toEqual([daysAgo(40).toISOString(), checkTime.toISOString()])
  })

  it('counts verified out of claimed per pillar', () => {
    const { pillars } = buildDashboardSummary(input({ skills: [react, sql, mentoring] }))
    expect(pillars.find((p) => p.label === 'Build')).toEqual({
      label: 'Build',
      claimed: 2,
      verified: 1,
    })
    expect(pillars.find((p) => p.label === 'Lead')).toEqual({
      label: 'Lead',
      claimed: 1,
      verified: 0,
    })
  })
})

describe('verifiedChangesFromHistory', () => {
  it('keeps only verified-flag changes', () => {
    const timestamp = daysAgo(1)
    expect(
      verifiedChangesFromHistory([
        {
          skillId: 'react',
          timestamp,
          changes: [
            { field: 'level', oldValue: 'beginner', newValue: 'advanced' },
            { field: 'verified', oldValue: false, newValue: true },
          ],
        },
        { skillId: 'sql', timestamp, changes: null },
      ])
    ).toEqual([{ skillId: 'react', timestamp, oldValue: false, newValue: true }])
  })
})
