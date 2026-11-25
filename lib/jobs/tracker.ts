/**
 * Saved jobs and the application tracker. One list per person; status
 * "saved" is a bookmark and the other statuses track an application.
 * Every read and write is scoped to the signed-in user.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'

export const TRACK_STATUSES = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
] as const

const opt = (n: number) =>
  z
    .string()
    .trim()
    .max(n)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

export const trackCreateSchema = z.object({
  jobRef: z
    .string()
    .regex(/^(ext|nexus):[a-z0-9]{10,40}$/)
    .nullable()
    .optional(),
  title: z.string().trim().min(1, 'Add the job title').max(200),
  company: z.string().trim().min(1, 'Add the company').max(200),
  location: opt(200),
  url: z
    .string()
    .trim()
    .url('Use a full link starting with https://')
    .max(1000)
    .refine((u) => /^https?:\/\//i.test(u), 'Use a web link')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  status: z.enum(TRACK_STATUSES).default('saved'),
  notes: opt(2000),
  nextStep: opt(300),
})

export const trackUpdateSchema = z.object({
  status: z.enum(TRACK_STATUSES).optional(),
  notes: opt(2000),
  nextStep: opt(300),
})

const MAX_TRACKED = 300

export class TrackerError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export async function listTracked(userId: string) {
  return prisma.trackedJob.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_TRACKED,
  })
}

export async function trackJob(userId: string, input: unknown) {
  const data = trackCreateSchema.parse(input)
  if ((await prisma.trackedJob.count({ where: { userId } })) >= MAX_TRACKED) {
    throw new TrackerError(`You can track up to ${MAX_TRACKED} jobs.`)
  }
  const appliedAt = data.status !== 'saved' ? new Date() : null
  if (data.jobRef) {
    return prisma.trackedJob.upsert({
      where: { userId_jobRef: { userId, jobRef: data.jobRef } },
      create: { ...data, userId, appliedAt },
      update: { status: data.status, ...(appliedAt ? { appliedAt } : {}) },
    })
  }
  return prisma.trackedJob.create({ data: { ...data, jobRef: null, userId, appliedAt } })
}

export async function updateTracked(userId: string, id: string, input: unknown) {
  const data = trackUpdateSchema.parse(input)
  const existing = await prisma.trackedJob.findFirst({
    where: { id, userId },
    select: { appliedAt: true },
  })
  if (!existing) throw new TrackerError('Not found', 404)
  const appliedAt =
    data.status && data.status !== 'saved' && !existing.appliedAt ? new Date() : undefined
  await prisma.trackedJob.update({
    where: { id },
    data: { ...data, ...(appliedAt ? { appliedAt } : {}) },
  })
}

export async function deleteTracked(userId: string, id: string) {
  const { count } = await prisma.trackedJob.deleteMany({ where: { id, userId } })
  if (count === 0) throw new TrackerError('Not found', 404)
}
