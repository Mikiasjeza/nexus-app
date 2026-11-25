/**
 * @jest-environment node
 */

import { syncJobs } from '@/lib/jobs/sync'

jest.mock('@/lib/db', () => ({
  prisma: {
    externalJob: {
      findMany: jest.fn(),
      createMany: jest.fn(async () => ({ count: 0 })),
      updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  },
}))

const job = (id: string, title: string, company = 'Acme') => ({
  source: 'greenhouse' as const,
  sourceId: `acme:${id}`,
  title,
  company,
  location: 'Remote',
  remote: true,
  salaryMin: null,
  salaryMax: null,
  salaryText: null,
  employmentType: 'full-time',
  description: 'Python and SQL. 2 years of experience.',
  applyUrl: `https://example.com/${id}`,
  postedAt: null,
  expiresAt: null,
})

jest.mock('@/lib/jobs/sources', () => ({
  sourceJobs: () => [
    {
      name: 'greenhouse:acme',
      run: async () => [job('1', 'Data Analyst'), job('2', 'Data Analyst'), job('3', 'Engineer')],
    },
    {
      name: 'lever:broken',
      run: async () => {
        throw new Error('HTTP 500')
      },
    },
  ],
}))

const { prisma } = jest.requireMock('@/lib/db') as {
  prisma: { externalJob: Record<string, jest.Mock> }
}

describe('job sync', () => {
  beforeEach(() => jest.clearAllMocks())

  it('adds new jobs once, skips duplicates, refreshes known ones and retires removed ones', async () => {
    prisma.externalJob.findMany
      .mockResolvedValueOnce([{ sourceId: 'acme:3' }]) // already known
      .mockResolvedValueOnce([]) // no duplicates from other sources
    const report = await syncJobs()

    const added = prisma.externalJob.createMany.mock.calls[0][0].data
    expect(added).toHaveLength(1) // acme:2 is the same job as acme:1
    expect(added[0]).toMatchObject({
      sourceId: 'acme:1',
      skills: expect.arrayContaining(['Python', 'SQL']),
    })
    expect(added[0].requirements.minYears).toBe(2)

    const updates = prisma.externalJob.updateMany.mock.calls.map((c) => c[0])
    expect(updates[0].where.sourceId).toEqual({ in: ['acme:3'] }) // refreshed
    expect(updates[1].where.sourceId).toEqual({ startsWith: 'acme:' }) // board's removed jobs retired
    expect(updates[1].data).toEqual({ active: false })

    expect(report.sources.find((s) => s.name === 'lever:broken')?.error).toMatch(/500/)
    expect(report.sources.find((s) => s.name === 'greenhouse:acme')?.added).toBe(1)
  })
})
