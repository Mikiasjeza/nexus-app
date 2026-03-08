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
    confidenceScore: number
    explanation: string
    suggestedLevel?: SkillLevel
    improvements: string[]
    tokensUsed: number
    cost: number
    model: string
  }
}

export const aiApi = {
  analyzeEvidence: async (payload: AnalyzeRequest): Promise<AnalyzeResponse> => {
    return fetchApi<AnalyzeResponse>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
