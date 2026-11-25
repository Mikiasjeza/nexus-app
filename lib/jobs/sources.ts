/**
 * Public job sources. Each returns postings in one shape; nothing is made up.
 *   USAJOBS     official US federal jobs (needs USAJOBS_API_KEY and USAJOBS_EMAIL)
 *   Greenhouse  companies' public job boards (no key)
 *   Lever       companies' public job boards (no key)
 * Company boards come from JOB_BOARDS_GREENHOUSE / JOB_BOARDS_LEVER (comma
 * separated board names) or the defaults below, all checked to exist.
 */

import { htmlToText, parseSalary } from './enrich'

export interface RawJob {
  source: 'usajobs' | 'greenhouse' | 'lever'
  sourceId: string
  title: string
  company: string
  location: string | null
  remote: boolean
  salaryMin: number | null
  salaryMax: number | null
  salaryText: string | null
  employmentType: string | null
  description: string
  applyUrl: string
  postedAt: Date | null
  expiresAt: Date | null
}

const DEFAULT_GREENHOUSE = [
  'stripe',
  'airbnb',
  'figma',
  'databricks',
  'robinhood',
  'coinbase',
  'dropbox',
  'reddit',
  'duolingo',
  'instacart',
  'discord',
  'gitlab',
  'cloudflare',
  'lyft',
  'pinterest',
  'asana',
  'twilio',
]
const DEFAULT_LEVER = ['palantir', 'spotify']
const PER_BOARD = 120
const MAX_DESCRIPTION = 6000
const TIMEOUT = 15_000

const list = (env: string | undefined, fallback: string[]) =>
  env
    ? env
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z0-9-]{2,60}$/.test(s))
    : fallback

const date = (v: unknown) => {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const isRemote = (...parts: (string | null | undefined)[]) =>
  parts.some((p) => p && /\bremote\b|anywhere/i.test(p))

function typeFrom(text: string | null | undefined): string | null {
  if (!text) return null
  if (/intern/i.test(text)) return 'internship'
  if (/part[- ]?time/i.test(text)) return 'part-time'
  if (/contract|temporary|temp\b|freelance/i.test(text)) return 'contract'
  if (/full[- ]?time|permanent|regular/i.test(text)) return 'full-time'
  return null
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT), cache: 'no-store' })
  if (!res.ok) throw new Error(`${url.split('?')[0]} -> HTTP ${res.status}`)
  return res.json()
}

export async function fetchUsajobs(): Promise<RawJob[]> {
  const key = process.env.USAJOBS_API_KEY
  const email = process.env.USAJOBS_EMAIL
  if (!key || !email) return []
  const headers = { Host: 'data.usajobs.gov', 'User-Agent': email, 'Authorization-Key': key }
  const out: RawJob[] = []
  for (let page = 1; page <= 3; page++) {
    const data = await getJson(
      `https://data.usajobs.gov/api/search?ResultsPerPage=500&Page=${page}&DatePosted=14&WhoMayApply=public`,
      headers
    )
    const items: Array<{
      MatchedObjectId?: string
      MatchedObjectDescriptor?: Record<string, unknown>
    }> = data?.SearchResult?.SearchResultItems ?? []
    for (const item of items) {
      const d = (item.MatchedObjectDescriptor ?? {}) as Record<string, any>
      const pay = d.PositionRemuneration?.[0]
      const min = Number(pay?.MinimumRange) || null
      const max = Number(pay?.MaximumRange) || null
      const yearly = !pay || /annum|year/i.test(pay?.Description ?? 'year')
      const details = d.UserArea?.Details ?? {}
      const description = [
        details.JobSummary,
        d.QualificationSummary,
        details.Education,
        Array.isArray(details.MajorDuties) ? details.MajorDuties.join('\n') : details.MajorDuties,
      ]
        .filter(Boolean)
        .join('\n\n')
      const applyUrl = d.ApplyURI?.[0] ?? d.PositionURI
      if (!d.PositionTitle || !applyUrl) continue
      out.push({
        source: 'usajobs',
        sourceId: String(item.MatchedObjectId ?? d.PositionID),
        title: String(d.PositionTitle).slice(0, 200),
        company: String(d.OrganizationName ?? d.DepartmentName ?? 'US Government').slice(0, 200),
        location: d.PositionLocationDisplay
          ? String(d.PositionLocationDisplay).slice(0, 200)
          : null,
        remote: Boolean(details.RemoteIndicator) || isRemote(d.PositionLocationDisplay),
        salaryMin: yearly ? min : null,
        salaryMax: yearly ? max : null,
        salaryText: min
          ? `$${min.toLocaleString()}${max ? `–$${max.toLocaleString()}` : ''} ${pay?.Description ?? ''}`.trim()
          : null,
        employmentType: typeFrom(d.PositionSchedule?.[0]?.Name),
        description: description.slice(0, MAX_DESCRIPTION),
        applyUrl: String(applyUrl),
        postedAt: date(d.PublicationStartDate),
        expiresAt: date(d.ApplicationCloseDate),
      })
    }
    if (items.length < 500) break
  }
  return out
}

export async function fetchGreenhouse(board: string): Promise<RawJob[]> {
  const data = await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
  )
  const jobs: Array<Record<string, any>> = (data?.jobs ?? []).slice(0, PER_BOARD)
  return jobs
    .filter((j) => j.title && j.absolute_url)
    .map((j) => {
      const text = htmlToText(String(j.content ?? ''))
      const salary = parseSalary(
        text.match(/\$\s?\d[\d,]*(?:k)?\s*(?:-|–|—|to)\s*\$\s?\d[\d,]*(?:k)?/i)?.[0]
      )
      const location = j.location?.name ? String(j.location.name).slice(0, 200) : null
      return {
        source: 'greenhouse' as const,
        sourceId: `${board}:${j.id}`,
        title: String(j.title).slice(0, 200),
        company: String(j.company_name ?? board).slice(0, 200),
        location,
        remote: isRemote(location, j.title),
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryText: null,
        employmentType: typeFrom(`${j.title} ${text.slice(0, 600)}`),
        description: text.slice(0, MAX_DESCRIPTION),
        applyUrl: String(j.absolute_url),
        postedAt: date(j.first_published ?? j.updated_at),
        expiresAt: date(j.application_deadline),
      }
    })
}

export async function fetchLever(board: string): Promise<RawJob[]> {
  const data = await getJson(`https://api.lever.co/v0/postings/${board}?mode=json`)
  const jobs: Array<Record<string, any>> = (Array.isArray(data) ? data : []).slice(0, PER_BOARD)
  return jobs
    .filter((j) => j.text && j.hostedUrl)
    .map((j) => {
      const text = [
        j.descriptionPlain,
        j.additionalPlain,
        ...(j.lists ?? []).map(
          (l: { text?: string; content?: string }) => `${l.text}\n${htmlToText(l.content ?? '')}`
        ),
      ]
        .filter(Boolean)
        .join('\n\n')
      const location = j.categories?.location ? String(j.categories.location).slice(0, 200) : null
      const range = j.salaryRange
      return {
        source: 'lever' as const,
        sourceId: `${board}:${j.id}`,
        title: String(j.text).slice(0, 200),
        company: board.charAt(0).toUpperCase() + board.slice(1),
        location,
        remote: j.workplaceType === 'remote' || isRemote(location),
        salaryMin: range?.interval === 'per-year-salary' ? Number(range.min) || null : null,
        salaryMax: range?.interval === 'per-year-salary' ? Number(range.max) || null : null,
        salaryText: null,
        employmentType: typeFrom(j.categories?.commitment),
        description: text.slice(0, MAX_DESCRIPTION),
        applyUrl: String(j.applyUrl ?? j.hostedUrl),
        postedAt: date(j.createdAt),
        expiresAt: null,
      }
    })
}

export function sourceJobs() {
  return [
    { name: 'usajobs', run: fetchUsajobs },
    ...list(process.env.JOB_BOARDS_GREENHOUSE, DEFAULT_GREENHOUSE).map((b) => ({
      name: `greenhouse:${b}`,
      run: () => fetchGreenhouse(b),
    })),
    ...list(process.env.JOB_BOARDS_LEVER, DEFAULT_LEVER).map((b) => ({
      name: `lever:${b}`,
      run: () => fetchLever(b),
    })),
  ]
}
