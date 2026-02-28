<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import ScoreGauge from '@/components/viz/ScoreGauge.vue'
import ReasonTags from '@/components/viz/ReasonTags.vue'
import ServiceBreakdown from '@/components/viz/ServiceBreakdown.vue'
import type { TransactionRecord } from '@/types'

const historyStore = useHistoryStore()

// Sort
const sortKey = ref<string>('submittedAt')
const sortDir = ref<'asc' | 'desc'>('desc')

// Filters
const filterDecision = ref<string[]>(['ALLOW', 'REVIEW', 'BLOCK'])
const filterCountry = ref('')
const filterAmountMin = ref<number | null>(null)
const filterAmountMax = ref<number | null>(null)

// Pagination
const perPage = ref(50)
const currentPage = ref(1)

// Modal
const selectedTx = ref<TransactionRecord | null>(null)

// Filtered & sorted data
const filteredData = computed(() => {
  let data = [...historyStore.transactions]

  // Decision filter
  data = data.filter((t) => filterDecision.value.includes(t.response.decision))

  // Country filter
  if (filterCountry.value) {
    const q = filterCountry.value.toUpperCase()
    data = data.filter((t) => t.request.country.includes(q))
  }

  // Amount range
  if (filterAmountMin.value !== null) {
    data = data.filter((t) => t.request.amount >= filterAmountMin.value!)
  }
  if (filterAmountMax.value !== null) {
    data = data.filter((t) => t.request.amount <= filterAmountMax.value!)
  }

  // Sort
  data.sort((a, b) => {
    let va: any, vb: any
    switch (sortKey.value) {
      case 'amount': va = a.request.amount; vb = b.request.amount; break
      case 'fraud_score': va = a.response.fraud_score; vb = b.response.fraud_score; break
      case 'country': va = a.request.country; vb = b.request.country; break
      case 'decision': va = a.response.decision; vb = b.response.decision; break
      default: va = a.submittedAt; vb = b.submittedAt;
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })

  return data
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / perPage.value)))

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredData.value.slice(start, start + perPage.value)
})

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortIcon(key: string) {
  if (sortKey.value !== key) return '⇅'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function toggleDecisionFilter(d: string) {
  const idx = filterDecision.value.indexOf(d)
  if (idx >= 0) {
    filterDecision.value.splice(idx, 1)
  } else {
    filterDecision.value.push(d)
  }
  currentPage.value = 1
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="card mb-4 flex flex-wrap items-center gap-4">
      <!-- Decision checkboxes -->
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">Decision:</span>
        <label v-for="d in ['ALLOW', 'REVIEW', 'BLOCK']" :key="d" class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="filterDecision.includes(d)"
            @change="toggleDecisionFilter(d)"
            class="w-3.5 h-3.5 rounded bg-gray-800 border-gray-600"
          />
          <span class="text-xs" :class="{
            'text-green-400': d === 'ALLOW',
            'text-yellow-400': d === 'REVIEW',
            'text-red-400': d === 'BLOCK',
          }">{{ d }}</span>
        </label>
      </div>

      <div class="w-px h-6 bg-gray-700" />

      <!-- Country -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Country:</span>
        <input v-model="filterCountry" placeholder="e.g. US" class="input w-20 text-xs" />
      </div>

      <div class="w-px h-6 bg-gray-700" />

      <!-- Amount range -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Amount:</span>
        <input v-model.number="filterAmountMin" type="number" placeholder="Min" class="input w-20 text-xs" />
        <span class="text-gray-600">—</span>
        <input v-model.number="filterAmountMax" type="number" placeholder="Max" class="input w-20 text-xs" />
      </div>

      <div class="flex-1" />
      <span class="text-xs text-gray-500">{{ filteredData.length }} results</span>
    </div>

    <!-- Table -->
    <div class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-400 text-left border-b border-gray-800">
            <th class="pb-2 pr-4 font-medium cursor-pointer hover:text-white" @click="toggleSort('submittedAt')">
              Timestamp {{ sortIcon('submittedAt') }}
            </th>
            <th class="pb-2 pr-4 font-medium">Transaction ID</th>
            <th class="pb-2 pr-4 font-medium">User ID</th>
            <th class="pb-2 pr-4 font-medium cursor-pointer hover:text-white" @click="toggleSort('amount')">
              Amount {{ sortIcon('amount') }}
            </th>
            <th class="pb-2 pr-4 font-medium cursor-pointer hover:text-white" @click="toggleSort('country')">
              Country {{ sortIcon('country') }}
            </th>
            <th class="pb-2 pr-4 font-medium cursor-pointer hover:text-white" @click="toggleSort('decision')">
              Decision {{ sortIcon('decision') }}
            </th>
            <th class="pb-2 pr-4 font-medium cursor-pointer hover:text-white" @click="toggleSort('fraud_score')">
              Score {{ sortIcon('fraud_score') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tx in pagedData"
            :key="tx.id"
            class="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
            @click="selectedTx = tx"
          >
            <td class="py-2.5 pr-4 text-gray-400 text-xs">{{ formatDate(tx.submittedAt) }}</td>
            <td class="py-2.5 pr-4 font-mono text-xs text-gray-300">{{ tx.request.transaction_id }}</td>
            <td class="py-2.5 pr-4 font-mono text-xs text-gray-300">{{ tx.request.user_id }}</td>
            <td class="py-2.5 pr-4 text-white font-medium">${{ tx.request.amount.toFixed(2) }}</td>
            <td class="py-2.5 pr-4 text-gray-300">{{ tx.request.country }}</td>
            <td class="py-2.5 pr-4"><DecisionBadge :decision="tx.response.decision" size="sm" /></td>
            <td class="py-2.5 font-mono" :class="{
              'text-green-400': tx.response.fraud_score < 0.4,
              'text-yellow-400': tx.response.fraud_score >= 0.4 && tx.response.fraud_score < 0.75,
              'text-red-400': tx.response.fraud_score >= 0.75,
            }">
              {{ tx.response.fraud_score.toFixed(4) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="pagedData.length === 0" class="text-center py-12 text-gray-600">
        <div class="text-3xl mb-2">📋</div>
        <p>No transactions match the current filters</p>
      </div>

      <!-- Pagination -->
      <div v-if="filteredData.length > 0" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">Per page:</span>
          <select v-model.number="perPage" class="input w-20 text-xs" @change="currentPage = 1">
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="500">500</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage <= 1"
            class="btn-ghost text-xs"
          >← Prev</button>
          <span class="text-xs text-gray-400">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="btn-ghost text-xs"
          >Next →</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedTx" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60" @click="selectedTx = null" />
          <div class="relative card w-full max-w-3xl max-h-[80vh] overflow-y-auto z-10">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Transaction Detail</h3>
              <button @click="selectedTx = null" class="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Score -->
              <div class="flex flex-col items-center gap-3">
                <ScoreGauge :score="selectedTx.response.fraud_score" :size="140" />
                <DecisionBadge :decision="selectedTx.response.decision" size="lg" />
              </div>

              <!-- Info -->
              <div class="space-y-3 text-sm">
                <div v-for="[label, value] in [
                  ['Transaction ID', selectedTx.request.transaction_id],
                  ['User ID', selectedTx.request.user_id],
                  ['Amount', '$' + selectedTx.request.amount.toFixed(2) + ' ' + selectedTx.request.currency],
                  ['Country', selectedTx.request.country],
                  ['Device', selectedTx.request.device_id],
                  ['IP', selectedTx.request.ip_address],
                  ['Category', selectedTx.request.merchant_category],
                  ['Payment', selectedTx.request.payment_method],
                  ['Time', formatDate(selectedTx.submittedAt)],
                ]" :key="label" class="flex justify-between">
                  <span class="text-gray-400">{{ label }}</span>
                  <span class="text-gray-200 font-mono text-xs">{{ value }}</span>
                </div>
              </div>
            </div>

            <!-- Reasons -->
            <div class="mt-6">
              <div class="text-sm text-gray-400 mb-2">Risk Factors</div>
              <ReasonTags :reasons="selectedTx.response.reasons" />
            </div>

            <!-- Service Breakdown -->
            <div class="mt-6">
              <ServiceBreakdown :services="selectedTx.response.service_scores" />
            </div>

            <!-- Raw JSON -->
            <details class="mt-6">
              <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Raw JSON</summary>
              <pre class="mt-2 p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">{{ JSON.stringify({ request: selectedTx.request, response: selectedTx.response }, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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
