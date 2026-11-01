/**
 * Read-only sample data for the employer side in guest mode and guest
 * preview, so the employer workspace can be shown without an account or a
 * database. Shapes match the real API responses.
 */

const DAY_MS = 86_400_000
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString()

export const GUEST_COMPANY = {
  id: 'guest-company',
  name: 'Sample Studio',
  slug: 'sample-studio',
  description: 'A sample company for exploring the employer workspace.',
  role: 'owner',
  jobCount: 2,
  poolCount: 1,
}

type GuestSkill = { name: string; level: string; verified: boolean; category: string }

export const GUEST_CANDIDATES: {
  id: string
  name: string
  bio: string
  shareableId: string
  skills: GuestSkill[]
}[] = [
  {
    id: 'cand-1',
    name: 'Amara Okafor',
    bio: 'Frontend engineer who ships design systems.',
    shareableId: 'sample-amara',
    skills: [
      { name: 'React', level: 'advanced', verified: true, category: 'Technical Skills' },
      { name: 'TypeScript', level: 'advanced', verified: true, category: 'Technical Skills' },
      { name: 'UI design', level: 'intermediate', verified: false, category: 'Creative Skills' },
    ],
  },
  {
    id: 'cand-2',
    name: 'Leo Fischer',
    bio: 'Data analyst turning messy data into decisions.',
    shareableId: 'sample-leo',
    skills: [
      { name: 'SQL', level: 'expert', verified: true, category: 'Technical Skills' },
      { name: 'Statistics', level: 'advanced', verified: true, category: 'Technical Skills' },
      { name: 'Writing', level: 'intermediate', verified: true, category: 'Communication Skills' },
    ],
  },
  {
    id: 'cand-3',
    name: 'Priya Nair',
    bio: 'Product designer with a research habit.',
    shareableId: 'sample-priya',
    skills: [
      { name: 'Product design', level: 'advanced', verified: true, category: 'Creative Skills' },
      { name: 'User research', level: 'advanced', verified: false, category: 'Creative Skills' },
      {
        name: 'Facilitation',
        level: 'intermediate',
        verified: true,
        category: 'Professional Skills',
      },
    ],
  },
  {
    id: 'cand-4',
    name: 'Sam Rivera',
    bio: 'Engineering lead who mentors new hires.',
    shareableId: 'sample-sam',
    skills: [
      { name: 'Team leadership', level: 'expert', verified: true, category: 'Professional Skills' },
      { name: 'Node.js', level: 'advanced', verified: false, category: 'Technical Skills' },
      { name: 'Mentoring', level: 'advanced', verified: true, category: 'Professional Skills' },
    ],
  },
  {
    id: 'cand-5',
    name: 'Mei Tanaka',
    bio: 'Self-taught developer, two years in.',
    shareableId: 'sample-mei',
    skills: [
      { name: 'JavaScript', level: 'intermediate', verified: true, category: 'Technical Skills' },
      {
        name: 'Learning in public',
        level: 'intermediate',
        verified: false,
        category: 'Learning & Growth',
      },
    ],
  },
]

export const GUEST_POOLS = [
  {
    id: 'guest-pool',
    name: 'Frontend shortlist',
    candidateIds: ['cand-1', 'cand-3'],
    createdAt: daysAgo(12),
  },
]

export const GUEST_JOBS = [
  {
    id: 'guest-job-1',
    title: 'Senior Frontend Engineer',
    description: 'Own our design system and the React app built on it.',
    skills: ['React', 'TypeScript', 'UI design'],
    location: 'Remote',
    type: 'full-time',
    salary: '$140k–$170k',
    status: 'active',
    company: { id: GUEST_COMPANY.id, name: GUEST_COMPANY.name, slug: GUEST_COMPANY.slug },
    createdAt: daysAgo(6),
  },
  {
    id: 'guest-job-2',
    title: 'Data Analyst',
    description: 'Turn product data into decisions with the team.',
    skills: ['SQL', 'Statistics', 'Writing'],
    location: 'Berlin',
    type: 'contract',
    salary: undefined,
    status: 'active',
    company: { id: GUEST_COMPANY.id, name: GUEST_COMPANY.name, slug: GUEST_COMPANY.slug },
    createdAt: daysAgo(20),
  },
]

export const GUEST_READ_ONLY = {
  error: 'Guest preview is read-only. Create an account to make changes.',
}

/** Talent search over the sample candidates, scored like the real route: query coverage, then verified share. */
export function guestTalentSearch(params: URLSearchParams) {
  const terms = (params.get('skills') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const level = params.get('level') || ''

  return GUEST_CANDIDATES.filter((c) => !level || c.skills.some((s) => s.level === level))
    .map((candidate) => {
      const names = candidate.skills.map((s) => s.name.toLowerCase())
      const matched = terms.filter((term) =>
        names.some((n) => n.includes(term) || term.includes(n))
      )
      const verifiedShare =
        candidate.skills.filter((s) => s.verified).length / Math.max(1, candidate.skills.length)
      const matchScore = terms.length
        ? Math.round((matched.length / terms.length) * 90 + verifiedShare * 10)
        : Math.round(45 + verifiedShare * 45)
      return {
        ...candidate,
        matchedPillars: [],
        matchedVerifiedSignals: candidate.skills.filter(
          (s) => s.verified && matched.some((m) => s.name.toLowerCase().includes(m))
        ).length,
        matchScore,
      }
    })
    .filter((c) => !terms.length || c.matchScore > 10)
    .sort((a, b) => b.matchScore - a.matchScore)
}

export function guestPoolList() {
  return GUEST_POOLS.map((pool) => ({
    id: pool.id,
    name: pool.name,
    candidateCount: pool.candidateIds.length,
    createdAt: pool.createdAt,
  }))
}

export function guestPoolDetail(id: string) {
  const pool = GUEST_POOLS.find((p) => p.id === id)
  if (!pool) return null
  return {
    ...pool,
    candidates: GUEST_CANDIDATES.filter((c) => pool.candidateIds.includes(c.id)),
  }
}

export function guestJobList(params: URLSearchParams) {
  const type = params.get('type') || ''
  const companyId = params.get('companyId') || ''
  const companySlug = params.get('companySlug') || ''
  return GUEST_JOBS.filter(
    (job) =>
      (!type || job.type === type) &&
      (!companyId || job.company.id === companyId) &&
      (!companySlug || job.company.slug === companySlug)
  )
}

/** A sample candidate's public passport, in the shape /api/share returns. */
export function guestPassport(shareableId: string) {
  const candidate = GUEST_CANDIDATES.find((c) => c.shareableId === shareableId)
  if (!candidate) return null
  const createdAt = daysAgo(40)
  return {
    user: {
      name: candidate.name,
      bio: candidate.bio,
      publicProfile: true,
      shareableId: candidate.shareableId,
    },
    skills: candidate.skills.map((skill, i) => ({
      id: `${candidate.id}-skill-${i}`,
      ...skill,
      progress: 0,
      createdAt,
      updatedAt: createdAt,
      visibility: 'public',
      status: 'published',
    })),
  }
}
