import {
  learningPlan,
  marketInsights,
  matchRole,
  recommendRoles,
  skillDemand,
  skillGaps,
  skillStrength,
  type CareerSkill,
} from '@/lib/career/analysis'
import { getRole } from '@/lib/career/roles'

const frontend = getRole('frontend-developer')!

const skills: CareerSkill[] = [
  { name: 'JavaScript', level: 'advanced', verified: true },
  { name: 'React', level: 'intermediate', verified: false },
  { name: 'CSS', level: 'beginner', verified: false },
]

describe('Career+ analysis', () => {
  it('counts verified skills more than claimed ones', () => {
    const claimed = skillStrength({ name: 'X', level: 'advanced', verified: false })
    const proven = skillStrength({ name: 'X', level: 'advanced', verified: true })
    expect(proven).toBeGreaterThan(claimed)
  })

  it('scores a role and labels each requirement', () => {
    const match = matchRole(frontend, skills)
    expect(match.score).toBeGreaterThan(0)
    expect(match.score).toBeLessThan(100)
    const status = (s: string) => match.requirements.find((r) => r.skill === s)?.status
    expect(status('JavaScript')).toBe('strong')
    expect(status('React')).toBe('ok')
    expect(status('CSS')).toBe('weak')
    expect(status('TypeScript')).toBe('missing')
  })

  it('recommends the closest roles first and skips roles with no overlap', () => {
    const recs = recommendRoles(skills)
    expect(recs.length).toBeGreaterThan(0)
    for (let i = 1; i < recs.length; i++)
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score)
    expect(recommendRoles([])).toEqual([])
  })

  it('puts missing core skills ahead of nice-to-haves and unverified ones', () => {
    const gaps = skillGaps(matchRole(frontend, skills))
    expect(gaps[0]).toMatchObject({ importance: 'core', status: 'missing' })
    const reactGap = gaps.find((g) => g.skill === 'React')
    expect(reactGap?.status).toBe('unverified')
    expect(gaps.find((g) => g.skill === 'JavaScript')).toBeUndefined()
  })

  it('raises gaps that many job listings ask for', () => {
    const demand = skillDemand([['TypeScript'], ['TypeScript', 'React'], ['typescript']])
    const gaps = skillGaps(matchRole(frontend, skills), demand)
    expect(gaps.find((g) => g.skill === 'TypeScript')?.demand).toBe(3)
  })

  it('counts each skill once per listing, ignoring case', () => {
    const demand = skillDemand([['SQL', 'sql'], ['SQL']])
    expect(Array.from(demand.values())).toEqual([2])
  })

  it('compares market demand with what the person has', () => {
    const demand = skillDemand([['JavaScript'], ['JavaScript'], ['Go']])
    const market = marketInsights(skills, demand)
    expect(market[0]).toMatchObject({ skill: 'JavaScript', listings: 2, verified: true })
    expect(market.find((m) => m.skill === 'Go')).toMatchObject({ youHave: false })
  })

  it('links plan steps to a Nexus assessment when one exists', () => {
    const steps = learningPlan(skillGaps(matchRole(frontend, skills)))
    const ts = steps.find((s) => s.skill === 'TypeScript')
    expect(ts?.action).toBe('add')
    expect(ts?.assessment?.slug).toBe('typescript')
  })
})
