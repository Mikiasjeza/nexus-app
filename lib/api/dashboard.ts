import type { DashboardSummary } from '@/lib/dashboard/summary'
import { fetchApi } from './fetcher'

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    return fetchApi<DashboardSummary>('/api/dashboard')
  },
}
