import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TransactionRecord, ConnectionStatus, StreamStats } from '@/types'

const MAX_BUFFER = 100

export const useStreamStore = defineStore('stream', () => {
  // State
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const isPlaying = ref(false)
  const speed = ref(1)
  const transactions = ref<TransactionRecord[]>([])

  // Computed stats
  const statistics = computed<StreamStats>(() => {
    const scores = transactions.value.map((t) => t.response.fraud_score)
    const total = transactions.value.length
    let allow = 0, review = 0, block = 0

    transactions.value.forEach((t) => {
      switch (t.response.decision) {
        case 'ALLOW': allow++; break
        case 'REVIEW': review++; break
        case 'BLOCK': block++; break
      }
    })

    const avgScore = total > 0
      ? scores.reduce((a, b) => a + b, 0) / total
      : 0

    return { total, allow, review, block, avgScore, scores }
  })

  const recentScores = computed(() => {
    return transactions.value.slice(0, MAX_BUFFER).map((t) => t.response.fraud_score).reverse()
  })

  // Actions
  function addTransaction(tx: TransactionRecord) {
    transactions.value.unshift(tx)
    if (transactions.value.length > MAX_BUFFER) {
      transactions.value.pop()
    }
  }

  function clearTransactions() {
    transactions.value = []
  }

  function setConnectionStatus(status: ConnectionStatus) {
    connectionStatus.value = status
  }

  function setPlaying(playing: boolean) {
    isPlaying.value = playing
  }

  function setSpeed(multiplier: number) {
    speed.value = Math.max(0.5, Math.min(10, multiplier))
  }

  function exportSession(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      transactionCount: transactions.value.length,
      transactions: transactions.value,
    }, null, 2)
  }

  function importSession(jsonStr: string) {
    try {
      const data = JSON.parse(jsonStr)
      if (data.transactions && Array.isArray(data.transactions)) {
        transactions.value = data.transactions.slice(0, MAX_BUFFER)
      }
    } catch (e) {
      console.error('Failed to import session:', e)
    }
  }

  return {
    connectionStatus,
    isPlaying,
    speed,
    transactions,
    statistics,
    recentScores,
    addTransaction,
    clearTransactions,
    setConnectionStatus,
    setPlaying,
    setSpeed,
    exportSession,
    importSession,
  }
})
