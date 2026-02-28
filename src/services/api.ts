import axios from 'axios'
import type { TransactionRequest, TransactionResponse, GraphData } from '@/types'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export const api = {
  async analyzeTransaction(payload: TransactionRequest): Promise<TransactionResponse> {
    const { data } = await client.post('/analyze', payload)
    return data
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
