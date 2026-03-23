import axios from 'axios'
import type { TransactionRequest, TransactionResponse, GraphData } from '@/types'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export function normalizeTransactionResponse(raw: any): TransactionResponse {
  const fraudScore = Number(raw?.fraud_score)
  const decision = raw?.decision
  const reasons = raw?.reasons
  const transactionId = raw?.transaction_id
  const timestamp = raw?.timestamp

  if (!Number.isFinite(fraudScore)) {
    throw new Error('Invalid fraud response: missing or non-numeric fraud_score')
  }

  if (decision !== 'ALLOW' && decision !== 'REVIEW' && decision !== 'BLOCK') {
    throw new Error('Invalid fraud response: decision must be ALLOW, REVIEW, or BLOCK')
  }

  if (!Array.isArray(reasons) || !reasons.every((r: unknown) => typeof r === 'string')) {
    throw new Error('Invalid fraud response: reasons must be a string[]')
  }

  if (typeof transactionId !== 'string' || !transactionId) {
    throw new Error('Invalid fraud response: missing transaction_id')
  }

  return {
    transaction_id: transactionId,
    fraud_score: fraudScore,
    decision,
    risk_level: raw?.risk_level,
    reasons: reasons.map((r: string) => r),
    rules_triggered: Array.isArray(raw?.rules_triggered) ? raw.rules_triggered : undefined,
    service_scores: Array.isArray(raw?.service_scores) ? raw.service_scores : undefined,
    processing_time_ms: raw?.processing_time_ms,
    timestamp: typeof timestamp === 'string' ? timestamp : undefined,
  }
}

export const api = {
  async analyzeTransaction(payload: TransactionRequest): Promise<TransactionResponse> {
    const maxAttempts = 2
    let attempt = 0
    let lastError: any

    while (attempt < maxAttempts) {
      try {
        const { data } = await client.post('/analyze', payload)
        return normalizeTransactionResponse(data)
      } catch (err: any) {
        lastError = err
        const status = err?.response?.status
        const transient = status === 502 || status === 503 || status === 504 || err?.code === 'ECONNABORTED'
        attempt += 1

        if (!transient || attempt >= maxAttempts) {
          throw err
        }

        await new Promise((resolve) => setTimeout(resolve, 600 * attempt))
      }
    }

    throw lastError
  },

  async getGraphNetwork(params?: {
    user_id?: string
    transaction_id?: string
    limit?: number
  }): Promise<GraphData> {
    const { data } = await client.get('/graph/network', { params })
    return data
  },

  async getHeatmapData(range: string = '7d'): Promise<{
    geographic: any[]
    temporal: any[]
  }> {
    const { data } = await client.get('/analytics/heatmap', { params: { range } })
    return data
  },

  async healthCheck(): Promise<any> {
    const { data } = await client.get('/health')
    return data
  },
}
