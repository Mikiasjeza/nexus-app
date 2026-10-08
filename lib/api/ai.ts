import { fetchApi } from './fetcher'

export type AIProvider = 'gemini' | 'openai' | 'anthropic'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface EvidenceInput {
  type: 'text' | 'code' | 'link' | 'file'
  content: string
  metadata?: {
    url?: string
    language?: string
    fileName?: string
    mimeType?: string
  }
}

export interface AnalyzeRequest {
  skillId: string
  skillName: string
  skillLevel: SkillLevel
  evidence: EvidenceInput[]
  provider?: AIProvider
  evidenceId?: string
}

export interface AnalyzeResponse {
  success: boolean
  data: {
    id: string
    skillId: string
    skillName: string
    confidenceScore: number
    explanation: string
    suggestedLevel?: SkillLevel
    improvements: string[]
    tokensUsed: number
    cost: number
    model: string
    verified: boolean
    createdAt: string
  }
}

export interface AnalysisHistoryItem {
  id: string
  skillId: string
  skillName: string
  skillLevel: SkillLevel
  confidenceScore: number
  explanation: string
  suggestedLevel?: SkillLevel
  improvements: string[]
  tokensUsed: number | null
  cost: number | null
  model: string
  verified: boolean
  createdAt: string
}

export interface AnalysisHistoryResponse {
  data: AnalysisHistoryItem[]
}

export interface CareerChatResponse {
  success: boolean
  data: {
    reply: string
    suggestedPrompts: string[]
    model: string
    tokensUsed: number
    cost: number
  }
}

export interface AIJobMatchItem {
  jobId: string
  matchScore: number
  reason: string
  matchingSkills: string[]
  gaps: string[]
  recommended: boolean
  job: {
    id: string
    title: string
    description?: string
    skills: string[]
    location?: string
    type: string
    salary?: string
    status: string
    createdAt: string
    company: { id: string; name: string; slug: string; logo?: string }
  } | null
}

export interface JobMatchesResponse {
  success: boolean
  data: {
    summary: string
    matches: AIJobMatchItem[]
    model: string
    tokensUsed: number
    cost: number
  }
}

export const aiApi = {
  analyzeEvidence: async (payload: AnalyzeRequest): Promise<AnalyzeResponse> => {
    return fetchApi<AnalyzeResponse>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getHistory: async (limit = 6): Promise<AnalysisHistoryItem[]> => {
    const response = await fetchApi<AnalysisHistoryResponse>(`/api/ai/analyze?limit=${limit}`)
    return response.data
  },

  chatCareerCoach: async (message: string): Promise<CareerChatResponse> => {
    return fetchApi<CareerChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  getJobMatches: async (): Promise<JobMatchesResponse> => {
    return fetchApi<JobMatchesResponse>('/api/ai/job-matches')
  },
}
