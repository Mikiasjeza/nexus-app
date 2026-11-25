/**
 * Career Profile on the server: validation and reads/writes. Every query is
 * scoped to the signed-in user. Nothing here marks anything as verified:
 * records are saved as "self_reported" and the client can't change that.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  AVAILABILITY,
  CERTIFICATION_KINDS,
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  WORK_ARRANGEMENTS,
} from './profile-options'

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as [T[number]['id'], ...T[number]['id'][]]

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
const optText = (max: number) => text(max).nullable().optional()
const textList = (maxItems: number, maxLen = 80) =>
  z
    .array(z.string().trim().min(1).max(maxLen))
    .max(maxItems)
    .transform((list) => Array.from(new Set(list)))

/** "2026-05" or "2026-05-01" -> Date (UTC first of month). Empty -> null. */
const monthDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Use a date like 2026-05')
  .transform((v) => new Date(`${v.slice(0, 7)}-01T00:00:00Z`))
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))

export const profileSchema = z
  .object({
    employmentStatus: z.enum(ids(EMPLOYMENT_STATUSES)).nullable(),
    currentlyStudent: z.boolean().nullable(),
    yearsExperience: z.number().int().min(0).max(60).nullable(),
    interests: textList(20),
    exploring: z.boolean(),
    desiredTitles: textList(10),
    longTermGoal: optText(600),
    targetCareer: optText(120),
    targetSkills: textList(20),
    progression: optText(600),
    locations: textList(10, 120),
    workArrangements: z.array(z.enum(ids(WORK_ARRANGEMENTS))).max(3),
    salaryMin: z.number().int().min(0).max(10_000_000).nullable(),
    salaryMax: z.number().int().min(0).max(10_000_000).nullable(),
    jobTypes: z.array(z.enum(ids(JOB_TYPES))).max(4),
    experienceLevels: z.array(z.enum(ids(EXPERIENCE_LEVELS))).max(4),
    willingToRelocate: z.boolean().nullable(),
    preferredIndustries: textList(20),
    availability: z.enum(ids(AVAILABILITY)).nullable(),
    onboardingStep: z.number().int().min(0).max(10),
  })
  .partial()
  .refine(
    (p) => p.salaryMin == null || p.salaryMax == null || p.salaryMin <= p.salaryMax,
    'The lowest salary must be below the highest.'
  )

export const educationSchema = z.object({
  institution: optText(200),
  level: z.enum(ids(EDUCATION_LEVELS)),
  fieldOfStudy: optText(200),
  status: z.enum(ids(EDUCATION_STATUSES)),
  startDate: monthDate,
  graduationDate: monthDate,
})

export const experienceSchema = z
  .object({
    employer: z.string().trim().min(1, 'Add the employer or organization').max(200),
    title: z.string().trim().min(1, 'Add your title or role').max(200),
    industry: optText(120),
    employmentType: z.enum(ids(EMPLOYMENT_TYPES)),
    startDate: monthDate,
    endDate: monthDate,
    current: z.boolean().default(false),
    description: optText(2000),
  })
  .transform((v) => ({ ...v, endDate: v.current ? null : v.endDate }))

export const certificationSchema = z.object({
  name: z.string().trim().min(1, 'Add the certification name').max(200),
  issuer: optText(200),
  kind: z.enum(ids(CERTIFICATION_KINDS)).default('certification'),
  issueDate: monthDate,
  expirationDate: monthDate,
})

export const RECORD_KINDS = ['education', 'experience', 'certifications'] as const
export type RecordKind = (typeof RECORD_KINDS)[number]

export const recordSchemas = {
  education: educationSchema,
  experience: experienceSchema,
  certifications: certificationSchema,
} as const

/** Each kind's table, with update/delete limited to the owner's rows. */
export function recordTable(kind: RecordKind) {
  if (kind === 'education') return prisma.educationRecord
  if (kind === 'experience') return prisma.workExperience
  return prisma.certificationRecord
}

const MAX_RECORDS = 30

export async function createRecord(userId: string, kind: RecordKind, input: unknown) {
  const data = recordSchemas[kind].parse(input) as Record<string, unknown>
  const table = recordTable(kind) as unknown as {
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<unknown>
  }
  if ((await table.count({ where: { userId } })) >= MAX_RECORDS) {
    throw new ProfileError(`You can add up to ${MAX_RECORDS} of these.`, 400)
  }
  return table.create({ data: { ...data, userId } })
}

export async function updateRecord(userId: string, kind: RecordKind, id: string, input: unknown) {
  const data = recordSchemas[kind].parse(input) as Record<string, unknown>
  const table = recordTable(kind) as unknown as {
    updateMany: (a: unknown) => Promise<{ count: number }>
  }
  const { count } = await table.updateMany({ where: { id, userId }, data })
  if (count === 0) throw new ProfileError('Not found', 404)
}

export async function deleteRecord(userId: string, kind: RecordKind, id: string) {
  const table = recordTable(kind) as unknown as {
    deleteMany: (a: unknown) => Promise<{ count: number }>
  }
  const { count } = await table.deleteMany({ where: { id, userId } })
  if (count === 0) throw new ProfileError('Not found', 404)
}

export class ProfileError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function saveProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input)
  return prisma.careerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}

/** Everything the person has entered, plus their skills, for the profile page. */
export async function loadCareerProfile(userId: string) {
  const [profile, education, experience, certifications, skills] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId } }),
    prisma.educationRecord.findMany({
      where: { userId },
      orderBy: [{ graduationDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.workExperience.findMany({
      where: { userId },
      orderBy: [{ current: 'desc' }, { startDate: 'desc' }],
    }),
    prisma.certificationRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.skill.findMany({
      where: { userId },
      select: { id: true, name: true, level: true, verified: true },
      orderBy: { order: 'asc' },
    }),
  ])
  return { profile, education, experience, certifications, skills }
}
