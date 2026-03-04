<script setup lang="ts">
import type { TransactionRecord } from '@/types'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import ScoreGauge from '@/components/viz/ScoreGauge.vue'
import ReasonTags from '@/components/viz/ReasonTags.vue'
import ServiceBreakdown from '@/components/viz/ServiceBreakdown.vue'

defineProps<{
  transaction: TransactionRecord | null
}>()

const emit = defineEmits<{
  close: []
}>()

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="transaction" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
        <div class="relative card w-full max-w-3xl max-h-[80vh] overflow-y-auto z-10">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Transaction Detail</h3>
            <button @click="emit('close')" class="text-gray-500 hover:text-white">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Score -->
            <div class="flex flex-col items-center gap-3">
              <ScoreGauge :score="transaction.response.fraud_score" :size="140" />
              <DecisionBadge :decision="transaction.response.decision" size="lg" />
            </div>

            <!-- Info -->
            <div class="space-y-3 text-sm">
              <div v-for="[label, value] in [
                ['Transaction ID', transaction.request.transaction_id],
                ['User ID', transaction.request.user_id],
                ['Amount', '$' + transaction.request.amount.toFixed(2) + ' ' + transaction.request.currency],
                ['Country', transaction.request.country],
                ['Device', transaction.request.device_id],
                ['IP', transaction.request.ip_address],
                ['Category', transaction.request.merchant_category],
                ['Payment', transaction.request.payment_method],
                ['Time', formatDate(transaction.submittedAt)],
              ]" :key="label" class="flex justify-between">
                <span class="text-gray-400">{{ label }}</span>
                <span class="text-gray-200 font-mono text-xs">{{ value }}</span>
              </div>
            </div>
          </div>

          <!-- Reasons -->
          <div class="mt-6">
            <div class="text-sm text-gray-400 mb-2">Risk Factors</div>
            <ReasonTags :reasons="transaction.response.reasons" />
          </div>

          <!-- Service Breakdown -->
          <div class="mt-6">
            <ServiceBreakdown :services="transaction.response.service_scores" />
          </div>

          <!-- Raw JSON -->
          <details class="mt-6">
            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Raw JSON</summary>
            <pre class="mt-2 p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">{{ JSON.stringify({ request: transaction.request, response: transaction.response }, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .card, .modal-leave-to .card {
  transform: scale(0.95);
}
</style>
