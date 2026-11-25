/**
 * Daily job sync: fetch every source, structure each posting, drop
 * duplicates, add new jobs, mark seen ones fresh, and retire expired or
 * removed listings. A failing source never stops the others.
 */

import { prisma } from '@/lib/db'
import { dedupeKey, extractSkills, inferLevel, parseRequirements } from './enrich'
import { sourceJobs, type RawJob } from './sources'

const DAY = 86_400_000

export interface SyncReport {
  sources: { name: string; fetched: number; added: number; error?: string }[]
  retired: number
  deleted: number
}

function enrich(job: RawJob) {
  const text = `${job.title}\n${job.description}`
  const requirements = parseRequirements(text)
  return {
    ...job,
    dedupeKey: dedupeKey(job.title, job.company, job.location),
    // A company's own product name (e.g. Figma at Figma) isn't a skill requirement.
    skills: extractSkills(text).filter((s) => s.toLowerCase() !== job.company.toLowerCase()),
    requirements: requirements as unknown as object,
    experienceLevel: inferLevel(job.title, requirements.minYears),
  }
}

async function saveBatch(name: string, raw: RawJob[]) {
  const now = new Date()
  const jobs = raw.map(enrich)
  if (jobs.length === 0) return 0
  const source = jobs[0].source

  const existing = await prisma.externalJob.findMany({
    where: { source, sourceId: { in: jobs.map((j) => j.sourceId) } },
    select: { sourceId: true },
  })
  const known = new Set(existing.map((e) => e.sourceId))

  // The same job posted through another source is skipped (first source wins).
  const fresh = jobs.filter((j) => !known.has(j.sourceId))
  const dupes = fresh.length
    ? await prisma.externalJob.findMany({
        where: {
          active: true,
          source: { not: source },
          dedupeKey: { in: fresh.map((j) => j.dedupeKey) },
        },
        select: { dedupeKey: true },
      })
    : []
  const taken = new Set(dupes.map((d) => d.dedupeKey))
  const seenKeys = new Set<string>()
  const toAdd = fresh.filter((j) => {
    if (taken.has(j.dedupeKey) || seenKeys.has(j.dedupeKey)) return false
    seenKeys.add(j.dedupeKey)
    return true
  })

  if (toAdd.length) {
    await prisma.externalJob.createMany({
      data: toAdd.map((j) => ({ ...j, firstSeenAt: now, lastSeenAt: now, active: true })),
      skipDuplicates: true,
    })
  }
  if (known.size) {
    await prisma.externalJob.updateMany({
      where: { source, sourceId: { in: Array.from(known) } },
      data: { lastSeenAt: now, active: true },
    })
  }

  // A company board lists all its open jobs, so anything missing was taken down.
  if (name.includes(':')) {
    const board = name.split(':')[1]
    await prisma.externalJob.updateMany({
      where: {
        source,
        sourceId: { startsWith: `${board}:` },
        active: true,
        lastSeenAt: { lt: now },
      },
      data: { active: false },
    })
  }
  return toAdd.length
}

export async function syncJobs(): Promise<SyncReport> {
  const report: SyncReport = { sources: [], retired: 0, deleted: 0 }
  const results = await Promise.allSettled(
    sourceJobs().map(async (s) => ({ s, jobs: await s.run() }))
  )

  for (const [i, r] of results.entries()) {
    const name = sourceJobs()[i].name
    if (r.status === 'rejected') {
      report.sources.push({ name, fetched: 0, added: 0, error: String(r.reason).slice(0, 200) })
      continue
    }
    try {
      const added = await saveBatch(name, r.value.jobs)
      report.sources.push({ name, fetched: r.value.jobs.length, added })
    } catch (e) {
      report.sources.push({
        name,
        fetched: r.value.jobs.length,
        added: 0,
        error: String(e).slice(0, 200),
      })
    }
  }

  const now = new Date()
  // Past the closing date, or not seen for 30 days (USAJOBS only returns recent postings).
  const retired = await prisma.externalJob.updateMany({
    where: {
      active: true,
      OR: [{ expiresAt: { lt: now } }, { lastSeenAt: { lt: new Date(now.getTime() - 30 * DAY) } }],
    },
    data: { active: false },
  })
  // Keep the table small: forget listings that closed over 60 days ago.
  const deleted = await prisma.externalJob.deleteMany({
    where: { active: false, lastSeenAt: { lt: new Date(now.getTime() - 60 * DAY) } },
  })
  report.retired = retired.count
  report.deleted = deleted.count
  return report
}
