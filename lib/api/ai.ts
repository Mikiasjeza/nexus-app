import { fetchApi } from './fetcher'

export type AIProvider = 'openai' | 'anthropic'
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
}
