export interface TransactionRequest {
  transaction_id: string
  user_id: string
  amount: number
  merchant_id: string
  timestamp: string
  country: string
  device_id: string
  ip_address: string
  /** BFF-only: not used by the Python fraud scoring engine */
  currency?: string
  /** BFF-only: not used by the Python fraud scoring engine */
  merchant_category?: string
  /** BFF-only: not used by the Python fraud scoring engine */
  payment_method?: string
  /** BFF-only: not used by the Python fraud scoring engine */
  is_international?: boolean
  /** BFF-only: not used by the Python fraud scoring engine */
  customer_age?: number
  /** BFF-only: not used by the Python fraud scoring engine */
  account_age_days?: number
  /** BFF-only: not used by the Python fraud scoring engine */
  transaction_hour?: number
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
  reasons: string[]
  timestamp: string
  /** Derived client-side from decision; not returned by the Python API */
  risk_level?: string
  /** Derived client-side from reasons[]; not returned by the Python API */
  rules_triggered?: RuleResult[]
  /** Not currently returned by the Python API */
  service_scores?: ServiceScore[]
  /** Not currently returned by the Python API */
  processing_time_ms?: number
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
  /** Number of rapid-fire submissions for burst scenarios (e.g. velocity-burst = 15) */
  burstCount?: number
  /** Burst mode: 'same-user' keeps user_id constant across burst; 'same-device' keeps device_id constant but varies user_id */
  burstMode?: 'same-user' | 'same-device'
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'
