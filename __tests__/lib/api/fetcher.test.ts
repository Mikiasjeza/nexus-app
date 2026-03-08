import { fetchApi } from '@/lib/api/fetcher'

describe('fetchApi', () => {
  const originalFetch = global.fetch
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        search: '?tab=overview',
        assign: jest.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
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
    expect(window.location.assign).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%3Ftab%3Doverview')
  })
})
