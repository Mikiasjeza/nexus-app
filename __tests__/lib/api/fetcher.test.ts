import { browserLocation, fetchApi } from '@/lib/api/fetcher'

describe('fetchApi', () => {
  const originalFetch = global.fetch
  let assignSpy: jest.SpiedFunction<typeof browserLocation.assign>

  beforeEach(() => {
    window.history.replaceState({}, '', '/dashboard?tab=overview')
    assignSpy = jest.spyOn(browserLocation, 'assign').mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    assignSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('redirects to login when API returns 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Not authenticated' }),
    } as any)

    await expect(fetchApi('/api/skills/stats')).rejects.toThrow('Not authenticated')
    expect(assignSpy).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%3Ftab%3Doverview')
  })
})
