import type { SkillCategory } from '@/lib/types'

export interface SkillPillarDetail {
  category: SkillCategory
  shortLabel: string
  summary: string
  proofFocus: string
}

export interface SkillSuggestionGroup {
  id: string
  label: string
  description: string
  skills: string[]
}

const SKILL_ALIAS_MAP: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'frontend javascript'],
  typescript: ['ts', 'typed javascript'],
  react: ['react.js', 'react development', 'reactjs'],
  'next.js': ['nextjs', 'next', 'next js'],
  'node.js': ['node', 'nodejs', 'backend javascript'],
  python: ['python development', 'python programming'],
  java: ['java development'],
  'c#': ['csharp', '.net', 'dotnet'],
  'c++': ['cpp'],
  sql: ['postgresql', 'mysql', 'database querying', 'database design'],
  aws: ['amazon web services', 'cloud infrastructure'],
  docker: ['containerization'],
  kubernetes: ['k8s', 'container orchestration'],
  devops: ['ci/cd', 'infrastructure automation', 'platform engineering'],
  cybersecurity: ['security engineering', 'application security', 'infosec'],
  'data analysis': ['analytics', 'data analytics', 'business intelligence'],
  'machine learning': ['ml', 'predictive modeling'],
  'prompt engineering': ['llm prompting', 'ai prompting'],
  'data engineering': ['etl', 'data pipelines'],
  tableau: ['dashboarding'],
  'power bi': ['bi dashboards'],
  excel: ['spreadsheet modeling'],
  statistics: ['statistical analysis'],
  'product design': ['product thinking', 'digital product design'],
  'ui design': ['user interface design', 'interface design'],
  'ux research': ['user research', 'ux'],
  figma: ['interface prototyping'],
  'design systems': ['component systems'],
  'product management': ['product strategy', 'roadmapping'],
  accessibility: ['a11y', 'inclusive design'],
  'project management': ['program management', 'delivery management'],
  marketing: ['marketing strategy', 'brand marketing'],
  seo: ['search engine optimization'],
  sales: ['business development'],
  operations: ['business operations'],
  'customer success': ['client success', 'account management'],
  leadership: ['team leadership', 'people leadership'],
  communication: ['written communication', 'verbal communication'],
  negotiation: ['deal negotiation'],
  'public speaking': ['presenting', 'presentation skills'],
  'technical writing': ['documentation'],
  'problem solving': ['critical thinking'],
  coaching: ['mentoring'],
  copywriting: ['content writing'],
  'video editing': ['post-production'],
  photography: ['photo editing'],
}

const LEGACY_CATEGORY_MAP: Record<string, SkillCategory> = {
  technical: 'Technical Skills',
  data: 'Technical Skills',
  design: 'Creative Skills',
  creative: 'Creative Skills',
  marketing: 'Creative Skills',
  communication: 'Communication Skills',
  leadership: 'Professional Skills',
  business: 'Professional Skills',
  other: 'Learning & Growth',
}

const CATEGORY_PATTERNS: Array<{ category: SkillCategory; pattern: RegExp }> = [
  {
    category: 'Technical Skills',
    pattern:
      /(react|next|node|javascript|typescript|python|java|c\+\+|c#|go|rust|sql|graphql|api|aws|docker|kubernetes|devops|testing|qa|security|cyber|data|analytics|machine learning|ml|ai|prompt|bi|tableau|power bi|statistics|nlp|computer vision)/,
  },
  {
    category: 'Creative Skills',
    pattern:
      /(design|ux|ui|figma|prototype|wireframe|research|accessibility|brand|design systems|creative|copywriting|video|motion|illustration|photography|branding|marketing|seo|content|social media|campaign)/,
  },
  {
    category: 'Communication Skills',
    pattern:
      /(communication|public speaking|writing|negotiation|presentation|storytelling|facilitation|speaking|messaging)/,
  },
  {
    category: 'Professional Skills',
    pattern:
      /(leadership|management|coaching|mentoring|stakeholder|sales|finance|strategy|operations|customer success|product management|project management|business analysis|crm|collaboration|teamwork)/,
  },
  {
    category: 'Learning & Growth',
    pattern:
      /(learning|upskilling|adaptability|consistency|improvement|growth|curiosity|self-learning|practice|iteration|resilience)/,
  },
]

export const SKILL_SUGGESTION_GROUPS: SkillSuggestionGroup[] = [
  {
    id: 'technical-skills',
    label: 'Technical Skills',
    description:
      'Programming, software delivery, data systems, AI workflows, infrastructure, and hands-on technical execution.',
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'Python',
      'Java',
      'C#',
      'C++',
      'SQL',
      'AWS',
      'Docker',
      'DevOps',
      'Cybersecurity',
      'Data Analysis',
      'Machine Learning',
    ],
  },
  {
    id: 'creative-skills',
    label: 'Creative Skills',
    description:
      'Design, storytelling, content creation, visual craft, and portfolio-based proof of execution.',
    skills: [
      'Product Design',
      'UI Design',
      'UX Research',
      'Figma',
      'Design Systems',
      'Brand Design',
      'Wireframing',
      'Accessibility',
      'Copywriting',
      'Video Editing',
      'Motion Design',
      'Marketing',
      'SEO',
      'Photography',
      'Illustration',
      'Content Strategy',
    ],
  },
  {
    id: 'communication-skills',
    label: 'Communication Skills',
    description:
      'Public speaking, writing clarity, persuasion, presentations, and how well ideas are explained to others.',
    skills: [
      'Communication',
      'Public Speaking',
      'Storytelling',
      'Negotiation',
      'Technical Writing',
      'Presentation Skills',
      'Facilitation',
      'Persuasion',
      'Speech Writing',
      'Interviewing',
      'Active Listening',
      'Messaging',
    ],
  },
  {
    id: 'professional-skills',
    label: 'Professional Skills',
    description:
      'Leadership, project delivery, collaboration, operations, ownership, and measurable workplace impact.',
    skills: [
      'Leadership',
      'Project Management',
      'Team Collaboration',
      'Problem Solving',
      'Stakeholder Management',
      'Operations',
      'Customer Success',
      'Product Management',
      'Strategic Planning',
      'Decision Making',
      'People Management',
      'Execution',
    ],
  },
  {
    id: 'learning-growth',
    label: 'Learning & Growth',
    description:
      'Learning speed, consistency, adaptability, improvement over time, and the discipline to keep leveling up.',
    skills: [
      'Learning Agility',
      'Consistency',
      'Skill Growth',
      'Adaptability',
      'Practice Discipline',
      'Self-Learning',
      'Curiosity',
      'Improvement Tracking',
      'Resilience',
      'Iteration',
      'Self-Reflection',
      'Habit Building',
    ],
  },
]

export const SKILL_PILLAR_DETAILS: SkillPillarDetail[] = [
  {
    category: 'Technical Skills',
    shortLabel: 'Build',
    summary: 'Show what you can build, ship, debug, automate, and analyze.',
    proofFocus:
      'Best verified through code, repositories, projects, data work, architecture, and technical problem-solving.',
  },
  {
    category: 'Creative Skills',
    shortLabel: 'Create',
    summary: 'Show taste, originality, craft, and how well your work connects with people.',
    proofFocus:
      'Best verified through portfolios, case studies, visuals, content quality, and finished creative output.',
  },
  {
    category: 'Communication Skills',
    shortLabel: 'Explain',
    summary: 'Show how clearly you write, speak, persuade, and tell compelling stories.',
    proofFocus:
      'Best verified through talks, writing samples, recordings, presentations, and audience engagement.',
  },
  {
    category: 'Professional Skills',
    shortLabel: 'Lead',
    summary: 'Show ownership, collaboration, execution, and the outcomes you drive with others.',
    proofFocus:
      'Best verified through project history, team delivery, stakeholder work, leadership signals, and measurable results.',
  },
  {
    category: 'Learning & Growth',
    shortLabel: 'Grow',
    summary: 'Show how quickly you improve, adapt, and keep momentum over time.',
    proofFocus:
      'Best verified through timeline evidence, before-and-after progress, repeated practice, and consistency.',
  },
]

export function getSkillPillarDetail(category: SkillCategory): SkillPillarDetail {
  return (
    SKILL_PILLAR_DETAILS.find((pillar) => pillar.category === category) ??
    SKILL_PILLAR_DETAILS[SKILL_PILLAR_DETAILS.length - 1]
  )
}

export function getSkillPillarForName(skillName: string): SkillPillarDetail {
  return getSkillPillarDetail(inferSkillCategory(skillName))
}

export function resolveSkillPillarQuery(value: string): SkillCategory | null {
  const normalized = canonicalizeSkillName(value)
  if (!normalized) return null

  const match = SKILL_PILLAR_DETAILS.find((pillar) => {
    const shortLabel = canonicalizeSkillName(pillar.shortLabel)
    const category = canonicalizeSkillName(pillar.category)
    if (normalized === shortLabel) return true
    if (normalized === category) return true
    if (normalized === category.replace(' skills', '')) return true
    if (normalized === 'growth' && pillar.category === 'Learning & Growth') return true
    return false
  })

  if (match) return match.category

  if (normalized === 'learn' || normalized === 'learning' || normalized === 'grow') {
    return 'Learning & Growth'
  }

  if (normalized === 'professional') {
    return 'Professional Skills'
  }

  if (normalized === 'technical') {
    return 'Technical Skills'
  }

  if (normalized === 'creative') {
    return 'Creative Skills'
  }

  if (normalized === 'communication') {
    return 'Communication Skills'
  }

  return null
}

export function normalizeSkillName(skill: string): string {
  return skill.trim().replace(/\s+/g, ' ')
}

export function canonicalizeSkillName(skill: string): string {
  return normalizeSkillName(skill).toLowerCase()
}

export function getSkillAliases(skill: string): string[] {
  const canonical = canonicalizeSkillName(skill)
  const aliases = SKILL_ALIAS_MAP[canonical] ?? []
  return [canonical, ...aliases.map(canonicalizeSkillName)]
}

export function inferSkillCategory(skill: string): SkillCategory {
  const normalized = canonicalizeSkillName(skill)

  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(normalized)) {
      return category
    }
  }

  return 'Learning & Growth'
}

export function normalizeSkillCategory(category: string): SkillCategory {
  const normalized = canonicalizeSkillName(category)
  return LEGACY_CATEGORY_MAP[normalized] ?? inferSkillCategory(category)
}

export function getSkillVerificationLens(category: SkillCategory): string {
  switch (category) {
    case 'Technical Skills':
      return 'Focus on code quality, technical depth, implementation correctness, system thinking, and problem-solving proof.'
    case 'Creative Skills':
      return 'Focus on originality, craft quality, portfolio strength, style consistency, execution detail, and audience or product impact.'
    case 'Communication Skills':
      return 'Focus on clarity, structure, persuasion, storytelling, pacing, tone, and how effectively the person explains ideas.'
    case 'Professional Skills':
      return 'Focus on leadership, delivery, collaboration, ownership, outcomes, execution quality, and measurable workplace impact.'
    case 'Learning & Growth':
      return 'Focus on consistency, improvement over time, adaptability, learning velocity, follow-through, and signals of sustained progress.'
    default:
      return 'Focus on real proof, depth of evidence, and outcomes.'
  }
}

export function skillsLooselyMatch(left: string, right: string): boolean {
  const leftCanonical = canonicalizeSkillName(left)
  const rightCanonical = canonicalizeSkillName(right)

  if (!leftCanonical || !rightCanonical) return false
  if (leftCanonical === rightCanonical) return true
  if (leftCanonical.includes(rightCanonical) || rightCanonical.includes(leftCanonical)) return true

  const leftAliases = new Set(getSkillAliases(left))
  const rightAliases = new Set(getSkillAliases(right))

  for (const alias of Array.from(leftAliases)) {
    if (rightAliases.has(alias)) {
      return true
    }
  }

  return false
}

const PILLAR_FALLBACK_WEIGHT = 0.48

/**
 * Per job requirement: full credit for name/alias match; partial credit when the
 * candidate has any published skill in the same inferred pillar (stronger than
 * distinct-pillar coverage alone when multiple skills map to one pillar).
 */
export function computeJobRequirementCoverage(
  jobSkills: string[],
  userSkills: Array<{ name: string; category: SkillCategory }>
): { exactRatio: number; pillarFallbackRatio: number; combinedRatio: number } {
  if (jobSkills.length === 0) {
    return { exactRatio: 0, pillarFallbackRatio: 0, combinedRatio: 0 }
  }

  const normalizedUser = userSkills.map((skill) => ({
    name: skill.name,
    category: normalizeSkillCategory(skill.category),
  }))

  let exactHits = 0
  let pillarHits = 0

  for (const jobSkill of jobSkills) {
    const exact = normalizedUser.some((userSkill) => skillsLooselyMatch(userSkill.name, jobSkill))
    if (exact) {
      exactHits += 1
      continue
    }
    const jobPillar = inferSkillCategory(jobSkill)
    const pillarMatch = normalizedUser.some((userSkill) => userSkill.category === jobPillar)
    if (pillarMatch) {
      pillarHits += 1
    }
  }

  const n = jobSkills.length
  return {
    exactRatio: exactHits / n,
    pillarFallbackRatio: pillarHits / n,
    combinedRatio: (exactHits + pillarHits * PILLAR_FALLBACK_WEIGHT) / n,
  }
}
