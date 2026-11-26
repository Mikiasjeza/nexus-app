/**
 * @jest-environment node
 */

import { fetchAdzuna } from '@/lib/jobs/sources'

describe('Adzuna source', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    delete process.env.ADZUNA_APP_ID
    delete process.env.ADZUNA_APP_KEY
    delete process.env.ADZUNA_PAGES
  })

  it('does nothing without keys', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch
    expect(await fetchAdzuna()).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('maps Adzuna results into jobs', async () => {
    process.env.ADZUNA_APP_ID = 'id'
    process.env.ADZUNA_APP_KEY = 'key'
    process.env.ADZUNA_PAGES = '1'
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 123,
            title: '<strong>Data</strong> Analyst',
            company: { display_name: 'Acme' },
            location: { display_name: 'Austin, Texas' },
            description: 'SQL and Python. Remote friendly.',
            redirect_url: 'https://www.adzuna.com/land/ad/123',
            created: '2026-11-20T10:00:00Z',
            salary_min: 60000,
            salary_max: 80000,
            contract_time: 'full_time',
          },
          { id: 124, title: 'No link' },
        ],
      }),
    })) as unknown as typeof fetch
    const jobs = await fetchAdzuna()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      source: 'adzuna',
      sourceId: '123',
      title: 'Data Analyst',
      company: 'Acme',
      salaryMin: 60000,
      salaryMax: 80000,
      employmentType: 'full-time',
      remote: true,
    })
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('results_per_page=50')
  })
})
