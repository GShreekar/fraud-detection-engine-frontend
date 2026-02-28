import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TransactionRecord } from '@/types'

const MAX_RECORDS = 10000

export const useHistoryStore = defineStore('history', () => {
  const transactions = ref<TransactionRecord[]>([])

  const totalCount = computed(() => transactions.value.length)

  const decisionCounts = computed(() => {
    const counts = { ALLOW: 0, REVIEW: 0, BLOCK: 0 }
    transactions.value.forEach((t) => {
      counts[t.response.decision]++
    })
    return counts
  })

  const avgFraudScore = computed(() => {
    if (transactions.value.length === 0) return 0
    const sum = transactions.value.reduce((acc, t) => acc + t.response.fraud_score, 0)
    return sum / transactions.value.length
  })

  function addTransaction(record: TransactionRecord) {
    transactions.value.unshift(record)
    if (transactions.value.length > MAX_RECORDS) {
      transactions.value = transactions.value.slice(0, MAX_RECORDS)
    }
  }

  function clearHistory() {
    transactions.value = []
  }

  function exportToCSV() {
    if (transactions.value.length === 0) return

    const headers = [
      'transaction_id', 'timestamp', 'user_id', 'amount', 'currency',
      'country', 'device_id', 'ip_address', 'merchant_category',
      'decision', 'fraud_score', 'risk_level', 'reasons',
    ]

    const rows = transactions.value.map((t) => [
      t.request.transaction_id,
      t.request.timestamp,
      t.request.user_id,
      t.request.amount,
      t.request.currency,
      t.request.country,
      t.request.device_id,
      t.request.ip_address,
      t.request.merchant_category,
      t.response.decision,
      t.response.fraud_score,
      t.response.risk_level,
      t.response.reasons.join('; '),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fraud_transactions_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    transactions,
    totalCount,
    decisionCounts,
    avgFraudScore,
    addTransaction,
    clearHistory,
    exportToCSV,
  }
}, {
  persist: {
    key: 'fraud-history',
    storage: localStorage,
  },
})
