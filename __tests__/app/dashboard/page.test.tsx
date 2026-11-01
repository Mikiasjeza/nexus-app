import React from 'react'
import { render, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

// The charts pull in ESM-only packages Jest doesn't transform; this test is about auth.
jest.mock('@/components/Dashboard/ActivityCalendar', () => () => null)
jest.mock('@/components/Dashboard/PillarRings', () => () => null)
jest.mock('@/components/Dashboard/VerifiedGrowth', () => () => null)

jest.mock('@/lib/api', () => ({
  authApi: {
    getCurrentUser: jest.fn().mockResolvedValue(null),
  },
  dashboardApi: {
    getSummary: jest.fn().mockRejectedValue(new Error('Not authenticated')),
  },
}))

describe('DashboardPage auth handling', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('redirects unauthenticated user to login', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/login?next=/dashboard')
    })
  })
})
