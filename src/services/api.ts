import axios from 'axios'
import type { TransactionRequest, TransactionResponse, GraphData } from '@/types'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

function normalizeTransactionResponse(raw: any, payload: TransactionRequest): TransactionResponse {
  const fraudScore = Number(raw?.fraud_score ?? 0)
  const reasons = Array.isArray(raw?.reasons) ? raw.reasons.map((r: any) => String(r)) : []
  const decision: TransactionResponse['decision'] = raw?.decision || (fraudScore >= 0.75 ? 'BLOCK' : fraudScore >= 0.4 ? 'REVIEW' : 'ALLOW')

  return {
    transaction_id: raw?.transaction_id || payload.transaction_id,
    fraud_score: fraudScore,
    decision,
    risk_level: raw?.risk_level || (decision === 'BLOCK' ? 'critical' : decision === 'REVIEW' ? 'high' : 'low'),
    reasons,
    rules_triggered: Array.isArray(raw?.rules_triggered)
      ? raw.rules_triggered
      : reasons.map((ruleName: string) => ({
          rule_name: ruleName,
          score: fraudScore,
          details: `Triggered: ${ruleName}`,
        })),
    service_scores: Array.isArray(raw?.service_scores) ? raw.service_scores : undefined,
    processing_time_ms: raw?.processing_time_ms,
    timestamp: raw?.timestamp || new Date().toISOString(),
  }
}

export const api = {
  async analyzeTransaction(payload: TransactionRequest): Promise<TransactionResponse> {
    const { data } = await client.post('/analyze', payload)
    return normalizeTransactionResponse(data, payload)
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
