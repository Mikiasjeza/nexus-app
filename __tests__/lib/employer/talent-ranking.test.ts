import { guestTalentSearch } from '@/lib/mock/employer'
import { matchesTalentTerms, parseTalentTerms, rankTalent } from '@/lib/employer/talent-ranking'

const search = (query: Record<string, string>) => guestTalentSearch(new URLSearchParams(query))
const names = (result: ReturnType<typeof search>) => result.candidates.map((c) => c.name)

describe('guest talent search', () => {
  it('finds candidates by pillar, not only by skill name', () => {
    const result = search({ skills: 'Build' })
    expect(result.candidates.length).toBeGreaterThan(0)
    for (const candidate of result.candidates) {
      expect(candidate.matchedPillars).toContain('Technical Skills')
    }
  })

  it('ranks against a sample role and returns that role', () => {
    const result = search({ jobId: 'guest-job-2' })
    expect(result.targetJob).toMatchObject({ id: 'guest-job-2', title: 'Data Analyst' })
    expect(result.targetJob?.pillars.length).toBeGreaterThan(0)
    // The analyst with SQL, Statistics and Writing fits the Data Analyst role best.
    expect(result.candidates[0].skills.map((s) => s.name)).toEqual(
      expect.arrayContaining(['SQL', 'Statistics', 'Writing'])
    )
  })

  it('ranks the same candidates differently for different roles', () => {
    expect(names(search({ jobId: 'guest-job-1' }))[0]).not.toBe(
      names(search({ jobId: 'guest-job-2' }))[0]
    )
  })

  it('ignores an unknown role instead of failing', () => {
    expect(search({ jobId: 'no-such-job' }).targetJob).toBeNull()
  })

  it('keeps only candidates with a matching skill at the chosen level', () => {
    for (const candidate of search({ skills: 'react', level: 'advanced' }).candidates) {
      expect(candidate.skills.some((s) => s.name === 'React' && s.level === 'advanced')).toBe(true)
    }
  })
})

describe('talent ranking', () => {
  const skill = (name: string, category: string, verified = true) => ({
    name,
    level: 'advanced',
    verified,
    category,
  })

  it('parses comma-separated terms in lower case', () => {
    expect(parseTalentTerms(' React, ,SQL ')).toEqual(['react', 'sql'])
  })

  it('matches a term by exact skill name or by the pillar it names', () => {
    const skills = [skill('Writing', 'Communication Skills')]
    expect(matchesTalentTerms(skills, ['writing'])).toBe(true)
    expect(matchesTalentTerms(skills, ['explain'])).toBe(true)
    expect(matchesTalentTerms(skills, ['react'])).toBe(false)
    expect(matchesTalentTerms(skills, [])).toBe(true)
  })

  it('puts the closest match first', () => {
    const ranked = rankTalent(
      [
        { id: 'a', skills: [skill('SQL', 'Technical Skills')] },
        {
          id: 'b',
          skills: [skill('React', 'Technical Skills'), skill('TypeScript', 'Technical Skills')],
        },
      ],
      { skillNames: ['react', 'typescript'], hasTargetJob: false, targetJobSkills: [] }
    )
    expect(ranked[0].id).toBe('b')
  })
})
