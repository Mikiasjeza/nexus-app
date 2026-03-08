import React from 'react'
import { render, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

jest.mock('@/lib/hooks/useSkills', () => ({
  useSkills: () => ({
    skills: [],
    loading: false,
  }),
}))

jest.mock('@/lib/api', () => ({
  authApi: {},
  skillsApi: {
    getStats: jest.fn().mockRejectedValue(new Error('Not authenticated')),
    getActivities: jest.fn().mockResolvedValue([]),
    getInsights: jest.fn().mockResolvedValue([]),
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
