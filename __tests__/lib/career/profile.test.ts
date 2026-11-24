/**
 * @jest-environment node
 */

import {
  certificationSchema,
  createRecord,
  deleteRecord,
  educationSchema,
  experienceSchema,
  profileSchema,
  updateRecord,
} from '@/lib/career/profile'
import { recommendAssessments } from '@/lib/career/summary'

jest.mock('@/lib/db', () => ({
  prisma: {
    educationRecord: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (a: { data: unknown }) => a.data),
      updateMany: jest.fn(async () => ({ count: 1 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    workExperience: {},
    certificationRecord: {},
  },
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: {
    educationRecord: {
      count: jest.Mock
      create: jest.Mock
      updateMany: jest.Mock
      deleteMany: jest.Mock
    }
  }
}

describe('career profile validation', () => {
  it('keeps completed and in-progress degrees apart and reads month dates', () => {
    const e = educationSchema.parse({
      level: 'associate',
      status: 'in_progress',
      graduationDate: '2027-05',
      institution: '',
    })
    expect(e.status).toBe('in_progress')
    expect(e.graduationDate?.toISOString()).toBe('2027-05-01T00:00:00.000Z')
    expect(e.institution).toBeNull()
    expect(() => educationSchema.parse({ level: 'phd', status: 'completed' })).toThrow()
  })

  it('never lets the browser mark a record verified', () => {
    const e = educationSchema.parse({
      level: 'bachelor',
      status: 'completed',
      verification: 'verified',
    })
    expect(e).not.toHaveProperty('verification')
    const c = certificationSchema.parse({ name: 'CPA', verification: 'verified' })
    expect(c).not.toHaveProperty('verification')
  })

  it('clears the end date for a current job', () => {
    const x = experienceSchema.parse({
      employer: 'Acme',
      title: 'Analyst',
      employmentType: 'internship',
      current: true,
      endDate: '2025-01',
    })
    expect(x.endDate).toBeNull()
  })

  it('rejects a salary range that is upside down', () => {
    expect(() => profileSchema.parse({ salaryMin: 90000, salaryMax: 50000 })).toThrow()
    expect(profileSchema.parse({ salaryMin: 50000, salaryMax: 90000 })).toMatchObject({
      salaryMin: 50000,
    })
  })

  it('de-duplicates list answers', () => {
    expect(profileSchema.parse({ interests: ['Finance', 'Finance'] }).interests).toEqual([
      'Finance',
    ])
  })
})

describe('career records', () => {
  beforeEach(() => jest.clearAllMocks())

  it('saves new records to the signed-in person', async () => {
    await createRecord('me', 'education', { level: 'ged', status: 'completed' })
    expect(prisma.educationRecord.create.mock.calls[0][0].data.userId).toBe('me')
  })

  it("only edits and deletes the person's own rows", async () => {
    await updateRecord('me', 'education', 'e1', { level: 'ged', status: 'completed' })
    expect(prisma.educationRecord.updateMany.mock.calls[0][0].where).toEqual({
      id: 'e1',
      userId: 'me',
    })
    await expect(deleteRecord('me', 'education', 'someone-elses')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('caps how many records one person can add', async () => {
    prisma.educationRecord.count.mockResolvedValueOnce(30)
    await expect(
      createRecord('me', 'education', { level: 'ged', status: 'completed' })
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('recommended assessments', () => {
  it('suggests proving self-reported skills first, then interests, skipping passed ones', () => {
    const recs = recommendAssessments(
      [
        { name: 'SQL', verified: false },
        { name: 'Python', verified: true },
      ],
      ['Finance'],
      new Set(['business-writing'])
    )
    expect(recs[0].slug).toBe('sql')
    expect(recs.map((r) => r.slug)).toContain('financial-analysis')
    expect(recs.map((r) => r.slug)).not.toContain('business-writing')
    expect(recs.map((r) => r.slug)).not.toContain('python')
  })
})
