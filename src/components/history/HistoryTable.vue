<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
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
  if (sortKey.value !== key) return '\u21C5'
  return sortDir.value === 'asc' ? '\u2191' : '\u2193'
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
        <div class="text-3xl mb-2 text-gray-600">
          <svg class="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
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
    <TransactionDetailModal :transaction="selectedTx" @close="selectedTx = null" />
  </div>
</template>
