import {
  WEIGHTS,
  checkEducation,
  checkExperience,
  evaluate,
  experienceYears,
  sectionOf,
  type CandidateProfile,
  type MatchJob,
} from '@/lib/jobs/eligibility'
import type { JobRequirements } from '@/lib/jobs/enrich'

const req = (r: Partial<JobRequirements>): JobRequirements => ({
  education: null,
  educationPreferred: false,
  minYears: null,
  certifications: [],
  equivalentAccepted: false,
  workAuthorization: null,
  ...r,
})

const person = (p: Partial<CandidateProfile> = {}): CandidateProfile => ({
  skills: [],
  education: [],
  experience: [],
  certifications: [],
  yearsExperience: null,
  desiredTitles: [],
  targetCareer: null,
  interests: [],
  locations: [],
  workArrangements: [],
  jobTypes: [],
  experienceLevels: [],
  willingToRelocate: null,
  salaryMin: null,
  currentlyStudent: null,
  ...p,
})

const job = (j: Partial<MatchJob> = {}): MatchJob => ({
  title: 'Junior Data Analyst',
  company: 'Acme',
  location: 'Austin, TX',
  remote: false,
  employmentType: 'full-time',
  experienceLevel: 'entry',
  salaryMin: null,
  salaryMax: null,
  skills: ['SQL', 'Python', 'Power BI'],
  requirements: null,
  ...j,
})

describe('eligibility checks', () => {
  it('weights add up to 100%', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('treats a degree in progress as not yet met', () => {
    const p = person({
      education: [{ level: 'associate', status: 'in_progress', fieldOfStudy: null }],
    })
    expect(checkEducation(p, req({ education: 'associate' })).status).toBe('not_met')
    expect(checkEducation(p, req({ education: 'associate' })).detail).toMatch(/in progress/)
  })

  it('accepts equivalent experience and preferred degrees instead of excluding', () => {
    const p = person({
      education: [{ level: 'high_school', status: 'completed', fieldOfStudy: null }],
    })
    expect(checkEducation(p, req({ education: 'bachelor', equivalentAccepted: true })).status).toBe(
      'equivalent'
    )
    expect(checkEducation(p, req({ education: 'bachelor', educationPreferred: true })).status).toBe(
      'equivalent'
    )
  })

  it('says unknown when the posting or the profile is silent', () => {
    expect(checkEducation(person(), req({})).status).toBe('unknown')
    expect(checkEducation(person(), req({ education: 'bachelor' })).status).toBe('unknown')
    expect(checkExperience(person(), req({ minYears: 3 })).status).toBe('unknown')
  })

  it('works out years from the jobs listed, ignoring volunteer work', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const p = person({
      experience: [
        {
          startDate: new Date('2023-01-01T00:00:00Z'),
          endDate: null,
          current: true,
          employmentType: 'full_time',
        },
        {
          startDate: new Date('2015-01-01T00:00:00Z'),
          endDate: new Date('2020-01-01T00:00:00Z'),
          current: false,
          employmentType: 'volunteer',
        },
      ],
    })
    expect(experienceYears(p, now)).toBe(3)
  })
})

describe('matching', () => {
  const analyst = person({
    skills: [
      { name: 'SQL', verified: true },
      { name: 'Python', verified: false },
    ],
    education: [{ level: 'bachelor', status: 'completed', fieldOfStudy: 'Economics' }],
    yearsExperience: 1,
    desiredTitles: ['Data Analyst'],
    locations: ['Austin, TX'],
    jobTypes: ['full-time'],
  })

  it('puts a job whose stated requirements are met into Qualified', () => {
    const r = evaluate(analyst, job({ requirements: req({ education: 'bachelor', minYears: 1 }) }))
    expect(r.qualified).toBe(true)
    expect(r.skills).toEqual({ verified: ['SQL'], selfReported: ['Python'], missing: ['Power BI'] })
    expect(sectionOf(analyst, r)).toEqual(expect.arrayContaining(['qualified', 'early']))
    expect(r.explanation).toMatch(/verified SQL/)
  })

  it('puts a goal-aligned job that asks for more into Growth, with what is missing', () => {
    const r = evaluate(
      analyst,
      job({
        title: 'Senior Data Analyst',
        experienceLevel: 'senior',
        requirements: req({ minYears: 5 }),
      })
    )
    expect(r.qualified).toBe(false)
    expect(sectionOf(analyst, r)).toContain('growth')
    expect(r.explanation).toMatch(/Still needed/)
  })

  it('scores verified skills higher than self-reported ones', () => {
    const verified = person({ skills: [{ name: 'SQL', verified: true }] })
    const claimed = person({ skills: [{ name: 'SQL', verified: false }] })
    const j = job({ skills: ['SQL'] })
    expect(evaluate(verified, j).relevance).toBeGreaterThan(evaluate(claimed, j).relevance)
  })

  it('shows work authorization wording but never lets it affect ranking', () => {
    const plain = evaluate(analyst, job())
    const withAuth = evaluate(
      analyst,
      job({ requirements: req({ workAuthorization: 'Must be a U.S. citizen' }) })
    )
    expect(withAuth.checks.workAuthorization?.status).toBe('unknown')
    expect(withAuth.relevance).toBe(plain.relevance)
    expect(withAuth.qualified).toBe(plain.qualified)
  })
})
