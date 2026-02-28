<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useHistoryStore } from '@/stores/historyStore'

const route = useRoute()
const historyStore = useHistoryStore()

const tabs = [
  { name: 'history-table', label: 'Table', icon: '📋' },
  { name: 'history-graph', label: 'Graph', icon: '🕸️' },
  { name: 'history-heatmap', label: 'Heatmap', icon: '🗺️' },
]
</script>

<template>
  <div class="max-w-[1920px] mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Transaction History</h1>
        <p class="text-gray-400 mt-1">{{ historyStore.totalCount }} transactions recorded</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="historyStore.exportToCSV()" class="btn-outline text-sm" :disabled="historyStore.totalCount === 0">
          📥 Export CSV
        </button>
        <button @click="historyStore.clearHistory()" class="btn-ghost text-sm text-red-400" :disabled="historyStore.totalCount === 0">
          🗑 Clear All
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-gray-800">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
        :class="route.name === tab.name
          ? 'text-white border-blue-500'
          : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'"
      >
        <span class="mr-1.5">{{ tab.icon }}</span>
        {{ tab.label }}
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>
