<script setup lang="ts">
import { computed } from 'vue'
import { useStreamStore } from '@/stores/streamStore'
import type { TransactionRecord } from '@/types'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'

const streamStore = useStreamStore()

const visibleTransactions = computed<TransactionRecord[]>(() => {
  return streamStore.transactions.slice(0, 50)
})

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString()
}

function scoreColor(score: number) {
  if (score < 0.4) return 'text-green-400'
  if (score < 0.75) return 'text-yellow-400'
  return 'text-red-400'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800">
      <h3 class="text-sm font-semibold text-gray-300">Live Transaction Feed</h3>
      <span class="text-xs text-gray-500">{{ visibleTransactions.length }} shown</span>
    </div>

    <div class="flex-1 overflow-y-auto space-y-1 p-2">
      <TransitionGroup name="feed">
        <div
          v-for="tx in visibleTransactions"
          :key="tx.id"
          class="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-all text-xs"
        >
          <!-- Score indicator -->
          <div
            class="w-1.5 h-8 rounded-full flex-shrink-0"
            :class="{
              'bg-green-500': tx.response.fraud_score < 0.4,
              'bg-yellow-500': tx.response.fraud_score >= 0.4 && tx.response.fraud_score < 0.75,
              'bg-red-500': tx.response.fraud_score >= 0.75,
            }"
          />

          <!-- Transaction info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-gray-300 truncate">{{ tx.request.user_id }}</span>
              <span class="text-gray-600">→</span>
              <span class="text-gray-400">{{ tx.request.country }}</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-white font-medium">${{ tx.request.amount.toFixed(2) }}</span>
              <span class="text-gray-600">{{ tx.request.merchant_category.replace(/_/g, ' ') }}</span>
            </div>
          </div>

          <!-- Score -->
          <div class="text-right flex-shrink-0">
            <div :class="scoreColor(tx.response.fraud_score)" class="font-mono font-bold">
              {{ tx.response.fraud_score.toFixed(3) }}
            </div>
            <DecisionBadge :decision="tx.response.decision" size="sm" />
          </div>

          <!-- Time -->
          <div class="text-gray-600 text-[10px] flex-shrink-0 w-16 text-right">
            {{ formatTime(tx.submittedAt) }}
          </div>
        </div>
      </TransitionGroup>

      <div
        v-if="visibleTransactions.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-600"
      >
        <div class="text-3xl mb-2">📡</div>
        <p class="text-sm">No transactions yet</p>
        <p class="text-xs">Start the stream to see live data</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-enter-active {
  transition: all 0.3s ease-out;
}
.feed-leave-active {
  transition: all 0.2s ease-in;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.feed-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
