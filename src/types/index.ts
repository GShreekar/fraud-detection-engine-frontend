export interface TransactionRequest {
  transaction_id: string
  user_id: string
  amount: number
  currency: string
  timestamp: string
  country: string
  device_id: string
  ip_address: string
  merchant_category: string
  payment_method: string
  is_international: boolean
  customer_age: number
  account_age_days: number
  transaction_hour: number
}

export interface RuleResult {
  rule_name: string
  score: number
  details: string
}

export interface ServiceScore {
  name: string
  score: number
  weight: number
  details?: Record<string, any>
}

export interface TransactionResponse {
  transaction_id: string
  fraud_score: number
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  risk_level: string
  reasons: string[]
  rules_triggered: RuleResult[]
  service_scores?: ServiceScore[]
  processing_time_ms?: number
  timestamp: string
}

export interface TransactionRecord {
  id: string
  request: TransactionRequest
  response: TransactionResponse
  submittedAt: string
}

export interface GraphNode {
  id: string
  type: 'User' | 'Device' | 'IPAddress' | 'Transaction'
  label: string
  properties?: Record<string, any>
}

export interface GraphEdge {
  source: string
  target: string
  type: 'PERFORMED' | 'USED_DEVICE' | 'ORIGINATED_FROM'
  properties?: Record<string, any>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface HeatmapCell {
  country?: string
  hour?: number
  day?: number
  avgScore: number
  count: number
}

export interface StreamStats {
  total: number
  allow: number
  review: number
  block: number
  avgScore: number
  scores: number[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  expectedDecision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  payload: Partial<TransactionRequest>
  category: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'
