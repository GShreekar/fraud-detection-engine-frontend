<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TransactionRequest, TransactionResponse } from '@/types'
import { reasonDescriptions } from '@/services/scenarios'

interface RequestResponseData {
  request: Partial<TransactionRequest>
  response: TransactionResponse
  isBurst?: boolean
  burstTotal?: number
}

const props = defineProps<{
  data: RequestResponseData | null
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'summary' | 'request' | 'response' | 'both'>('summary')
const copiedTab = ref<string | null>(null)

function copyToClipboard(text: string, tab: string) {
  navigator.clipboard.writeText(text)
  copiedTab.value = tab
  setTimeout(() => {
    copiedTab.value = null
  }, 2000)
}

function getRequestJson() {
  return JSON.stringify(props.data?.request, null, 2)
}

function getResponseJson() {
  return JSON.stringify(props.data?.response, null, 2)
}

function formatCurrency(amount?: number, currency?: string) {
  if (amount === undefined) return 'Not available'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`
  }
}

function formatDecision(decision?: TransactionResponse['decision']) {
  if (decision === 'BLOCK') return 'Blocked for safety review'
  if (decision === 'REVIEW') return 'Needs manual review'
  if (decision === 'ALLOW') return 'Approved'
  return 'Not available'
}

function formatRiskScore(score?: number) {
  if (score === undefined) return 'Not available'
  const percent = Math.round(score * 100)
  if (score >= 0.75) return `${percent}% (high risk)`
  if (score >= 0.4) return `${percent}% (medium risk)`
  return `${percent}% (low risk)`
}

function formatReason(reason: string) {
  return reasonDescriptions[reason] || reason.replace(/_/g, ' ')
}

const summaryItems = computed(() => {
  const request = props.data?.request
  const response = props.data?.response
  return [
    { label: 'Final outcome', value: formatDecision(response?.decision) },
    { label: 'Risk score', value: formatRiskScore(response?.fraud_score) },
    { label: 'Amount', value: formatCurrency(request?.amount, request?.currency) },
    { label: 'Country', value: request?.country || 'Not available' },
    { label: 'Merchant type', value: request?.merchant_category || 'Not available' },
  ]
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="props.data"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70"
          @click="emit('close')"
        />

        <!-- Modal -->
        <div class="relative card w-full max-w-4xl max-h-[90vh] overflow-hidden z-10 flex flex-col">
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
            <div class="flex-1">
              <h2 class="text-lg font-semibold text-white">
                Scenario Result
              </h2>
              <p class="text-xs text-gray-500 mt-1">
                <template v-if="props.data.isBurst">
                  This test sent {{ props.data.burstTotal }} transactions. Showing the latest successful result.
                </template>
                <template v-else>
                  Plain-language summary first, with technical details available below.
                </template>
              </p>
            </div>
            <button
              class="text-gray-500 hover:text-white flex-shrink-0"
              @click="emit('close')"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Tab selector -->
          <div class="flex gap-2 mb-4 pb-2 border-b border-gray-700">
            <button
              class="pb-2 text-sm font-medium transition-colors"
              :class="{
                'text-blue-400 border-b-2 border-blue-400': activeTab === 'summary',
                'text-gray-400 hover:text-gray-300': activeTab !== 'summary',
              }"
              @click="activeTab = 'summary'"
            >
              Summary
            </button>
            <button
              class="pb-2 text-sm font-medium transition-colors"
              :class="{
                'text-blue-400 border-b-2 border-blue-400': activeTab === 'both',
                'text-gray-400 hover:text-gray-300': activeTab !== 'both',
              }"
              @click="activeTab = 'both'"
            >
              Full Data
            </button>
            <button
              class="pb-2 text-sm font-medium transition-colors"
              :class="{
                'text-blue-400 border-b-2 border-blue-400': activeTab === 'request',
                'text-gray-400 hover:text-gray-300': activeTab !== 'request',
              }"
              @click="activeTab = 'request'"
            >
              Sent Data
            </button>
            <button
              class="pb-2 text-sm font-medium transition-colors"
              :class="{
                'text-blue-400 border-b-2 border-blue-400': activeTab === 'response',
                'text-gray-400 hover:text-gray-300': activeTab !== 'response',
              }"
              @click="activeTab = 'response'"
            >
              Result Data
            </button>
          </div>

          <!-- Content area -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <!-- Summary Tab -->
            <template v-if="activeTab === 'summary'">
              <div class="flex-1 overflow-y-auto">
                <div class="rounded-lg bg-gray-900/50 border border-gray-800 p-4 mb-4">
                  <h3 class="text-sm font-semibold text-white mb-3">What happened</h3>
                  <div class="space-y-2">
                    <div
                      v-for="item in summaryItems"
                      :key="item.label"
                      class="flex items-start justify-between gap-4"
                    >
                      <span class="text-xs text-gray-400">{{ item.label }}</span>
                      <span class="text-xs text-gray-200 text-right">{{ item.value }}</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg bg-gray-900/50 border border-gray-800 p-4 mb-4">
                  <h3 class="text-sm font-semibold text-white mb-2">Why this result was given</h3>
                  <div v-if="props.data.response.reasons?.length" class="space-y-2">
                    <div
                      v-for="reason in props.data.response.reasons"
                      :key="reason"
                      class="text-xs text-gray-300"
                    >
                      • {{ formatReason(reason) }}
                    </div>
                  </div>
                  <p v-else class="text-xs text-gray-400">No specific risk reasons were returned.</p>
                </div>

                <div class="text-[11px] text-gray-500">
                  Need the raw technical JSON? Use the Full Data, Sent Data, or Result Data tabs.
                </div>
              </div>
            </template>

            <!-- Full Exchange Tab -->
            <template v-if="activeTab === 'both'">
              <div class="flex-1 overflow-y-auto">
                <div class="space-y-4">
                  <!-- Request section -->
                  <div>
                    <div class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 px-3">
                      Sent data
                    </div>
                    <div class="relative group">
                      <pre class="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto font-mono max-h-72 overflow-y-auto border border-gray-800"><code>{{ getRequestJson() }}</code></pre>
                      <button
                        class="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded transition-colors opacity-0 group-hover:opacity-100"
                        :class="{
                          'bg-green-600 text-white': copiedTab === 'request-both',
                          'bg-gray-700 text-gray-300 hover:bg-gray-600': copiedTab !== 'request-both',
                        }"
                        @click="copyToClipboard(getRequestJson(), 'request-both')"
                      >
                        {{ copiedTab === 'request-both' ? '✓ Copied' : 'Copy' }}
                      </button>
                    </div>
                  </div>

                  <!-- Response section -->
                  <div>
                    <div class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 px-3">
                      Result data
                    </div>
                    <div class="relative group">
                      <pre class="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto font-mono max-h-72 overflow-y-auto border border-gray-800"><code>{{ getResponseJson() }}</code></pre>
                      <button
                        class="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded transition-colors opacity-0 group-hover:opacity-100"
                        :class="{
                          'bg-green-600 text-white': copiedTab === 'response-both',
                          'bg-gray-700 text-gray-300 hover:bg-gray-600': copiedTab !== 'response-both',
                        }"
                        @click="copyToClipboard(getResponseJson(), 'response-both')"
                      >
                        {{ copiedTab === 'response-both' ? '✓ Copied' : 'Copy' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Request Only Tab -->
            <template v-if="activeTab === 'request'">
              <div class="flex-1 overflow-y-auto">
                <div class="relative group h-full">
                  <pre class="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto font-mono h-full border border-gray-800"><code>{{ getRequestJson() }}</code></pre>
                  <button
                    class="absolute top-4 right-4 px-2 py-1 text-xs font-medium rounded transition-colors opacity-0 group-hover:opacity-100"
                    :class="{
                      'bg-green-600 text-white': copiedTab === 'request-tab',
                      'bg-gray-700 text-gray-300 hover:bg-gray-600': copiedTab !== 'request-tab',
                    }"
                    @click="copyToClipboard(getRequestJson(), 'request-tab')"
                  >
                    {{ copiedTab === 'request-tab' ? '✓ Copied' : 'Copy' }}
                  </button>
                </div>
              </div>
            </template>

            <!-- Response Only Tab -->
            <template v-if="activeTab === 'response'">
              <div class="flex-1 overflow-y-auto">
                <div class="relative group h-full">
                  <pre class="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto font-mono h-full border border-gray-800"><code>{{ getResponseJson() }}</code></pre>
                  <button
                    class="absolute top-4 right-4 px-2 py-1 text-xs font-medium rounded transition-colors opacity-0 group-hover:opacity-100"
                    :class="{
                      'bg-green-600 text-white': copiedTab === 'response-tab',
                      'bg-gray-700 text-gray-300 hover:bg-gray-600': copiedTab !== 'response-tab',
                    }"
                    @click="copyToClipboard(getResponseJson(), 'response-tab')"
                  >
                    {{ copiedTab === 'response-tab' ? '✓ Copied' : 'Copy' }}
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="mt-4 pt-4 border-t border-gray-700 flex justify-end">
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              @click="emit('close')"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
