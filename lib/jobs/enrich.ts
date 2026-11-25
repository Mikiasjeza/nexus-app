/**
 * Turns a raw job posting into structured data: skills it names, education
 * and experience it asks for, certifications, whether equivalent experience
 * is accepted, work authorization notes, and a rough experience level.
 * Pure functions, no network. Only what the text actually says is recorded;
 * anything not mentioned stays null ("unknown"), never guessed.
 */

import { SKILL_SUGGESTION_GROUPS } from '@/lib/skills-taxonomy'
import { ASSESSMENTS } from '@/lib/assessments/catalog'

export type EducationRequirement =
  | 'high_school'
  | 'associate'
  | 'bachelor'
  | 'master'
  | 'doctorate'
  | null

export interface JobRequirements {
  education: EducationRequirement
  /** True when the posting says the degree is preferred rather than required. */
  educationPreferred: boolean
  minYears: number | null
  certifications: string[]
  /** "or equivalent experience" and similar wording. */
  equivalentAccepted: boolean
  /** Work authorization or citizenship wording, quoted briefly, when explicit. */
  workAuthorization: string | null
}

const EXTRA_SKILLS = [
  'Excel',
  'Tableau',
  'Power BI',
  'Statistics',
  'Machine Learning',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Linux',
  'Go',
  'Java',
  'C++',
  'C#',
  'Ruby',
  'Rust',
  'Kotlin',
  'Swift',
  'React',
  'Node.js',
  'Next.js',
  'GraphQL',
  'Figma',
  'Salesforce',
  'Accounting',
  'Financial Modeling',
  'Project Management',
  'Agile',
  'Scrum',
  'SEO',
  'Data Analysis',
  'Data Visualization',
  'Communication',
  'Leadership',
  'Customer Service',
  'Cybersecurity',
  'Networking',
  'Snowflake',
  'Spark',
  'Airflow',
  'dbt',
  'Looker',
]

let skillPatterns: { name: string; re: RegExp }[] | null = null
function patterns() {
  if (skillPatterns) return skillPatterns
  const names = new Set<string>([
    ...SKILL_SUGGESTION_GROUPS.flatMap((g) => g.skills),
    ...ASSESSMENTS.map((a) => a.skillName),
    ...EXTRA_SKILLS,
  ])
  skillPatterns = Array.from(names)
    .filter((n) => n.length >= 2)
    .map((name) => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Short names like "Go" or "R" need exact case to avoid matching ordinary words.
      const flags = name.length <= 3 ? '' : 'i'
      return { name, re: new RegExp(`(^|[^A-Za-z0-9+#])${esc}($|[^A-Za-z0-9+#])`, flags) }
    })
  return skillPatterns
}

export function extractSkills(text: string, max = 15): string[] {
  const found: string[] = []
  for (const { name, re } of patterns()) {
    if (re.test(text)) found.push(name)
    if (found.length >= max) break
  }
  return found
}

const CERTS = [
  'CPA',
  'CFA',
  'PMP',
  'CISSP',
  'CISM',
  'CompTIA Security+',
  'Security+',
  'CCNA',
  'SHRM-CP',
  'Six Sigma',
  'AWS Certified',
  'Azure Certified',
  'Scrum Master',
  'RN',
  'CDL',
  'EIT',
  'PE license',
]

const EDU_PATTERNS: [Exclude<EducationRequirement, null>, RegExp][] = [
  ['doctorate', /\b(ph\.?d|doctorate|doctoral degree)\b/i],
  ['master', /\b(master'?s|m\.s\.|msc|mba)\b/i],
  [
    'bachelor',
    /\b(bachelor'?s|b\.s\.|b\.a\.|bsc|undergraduate degree|4-year degree|four-year degree)\b/i,
  ],
  ['associate', /\bassociate'?s? degree\b/i],
  ['high_school', /\b(high school diploma|high school|ged)\b/i],
]

export function parseRequirements(text: string): JobRequirements {
  // The lowest degree that is clearly asked for is the requirement.
  let education: EducationRequirement = null
  let at = -1
  for (const [level, re] of EDU_PATTERNS.slice().reverse()) {
    const i = text.search(re)
    if (i >= 0) {
      education = level
      at = i
      break
    }
  }
  const educationPreferred =
    at >= 0 &&
    /\b(preferred|nice to have|a plus|bonus)\b/i.test(text.slice(Math.max(0, at - 80), at + 160))

  let minYears: number | null = null
  const years = Array.from(
    text.matchAll(
      /(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?(?:'|’)?\s+(?:of\s+)?(?:\w+\s+){0,4}?experience/gi
    )
  )
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 30)
  if (years.length) minYears = Math.min(...years)

  const certifications = CERTS.filter((c) =>
    new RegExp(
      `(^|[^A-Za-z])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z])`,
      c.length <= 3 ? '' : 'i'
    ).test(text)
  )

  const equivalentAccepted =
    /\bor equivalent\b|\bequivalent (?:practical |work |professional )?experience\b|\bor (?:a )?combination of education and experience\b|\bin lieu of\b/i.test(
      text
    )

  const auth = text.match(
    /[^.\n]{0,80}\b(U\.?S\.? citizen(?:ship)?|authorized to work in the (?:U\.?S\.?|United States)|security clearance|visa sponsorship)[^.\n]{0,80}/i
  )

  return {
    education,
    educationPreferred,
    minYears,
    certifications,
    equivalentAccepted,
    workAuthorization: auth ? auth[0].trim().slice(0, 200) : null,
  }
}

export function inferLevel(title: string, minYears: number | null): string | null {
  if (/\bintern(ship)?\b|\bco-?op\b|\bapprentice/i.test(title)) return 'internship'
  if (/\b(senior|sr\.?|staff|principal|lead|head|director|manager|vp)\b/i.test(title))
    return 'senior'
  if (/\b(junior|jr\.?|entry|associate|graduate|new grad|trainee|i)\b/i.test(title)) return 'entry'
  if (minYears !== null) return minYears <= 2 ? 'entry' : minYears >= 6 ? 'senior' : 'mid'
  return null
}

/** "Data Analyst" + "Acme Inc." + "New York, NY" -> one key, to drop duplicates across sources. */
export function dedupeKey(title: string, company: string, location: string | null): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|co)\b\.?/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  return [norm(title), norm(company), norm(location ?? '')].join('|')
}

export function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/** "$57K - $67K", "120,000–150,000 USD" -> numbers (yearly), when clearly stated. */
export function parseSalary(text: string | null | undefined): {
  min: number | null
  max: number | null
} {
  if (!text) return { min: null, max: null }
  const nums = Array.from(text.matchAll(/\$?\s*(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s*(k)?/gi))
    .map((m) => {
      let n = Number(m[1].replace(/,/g, ''))
      if (m[2]) n *= 1000
      return n
    })
    .filter((n) => n >= 10_000 && n <= 2_000_000)
  if (nums.length === 0) return { min: null, max: null }
  return { min: Math.min(...nums), max: Math.max(...nums) }
}
