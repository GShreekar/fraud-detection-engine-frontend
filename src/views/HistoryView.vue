<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useHistoryStore } from '@/stores/historyStore'

const route = useRoute()
const historyStore = useHistoryStore()

const tabs = [
  { name: 'history-table', label: 'Table', icon: 'clipboard' },
  { name: 'history-graph', label: 'Graph', icon: 'network' },
  { name: 'history-heatmap', label: 'Heatmap', icon: 'map' },
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
        <button @click="historyStore.exportToCSV()" class="btn-outline text-sm inline-flex items-center gap-1.5" :disabled="historyStore.totalCount === 0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export CSV
        </button>
        <button @click="historyStore.clearHistory()" class="btn-ghost text-sm text-red-400 inline-flex items-center gap-1.5" :disabled="historyStore.totalCount === 0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Clear All
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-gray-800">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px inline-flex items-center gap-1.5"
        :class="route.name === tab.name
          ? 'text-white border-blue-500'
          : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'"
      >
        <!-- clipboard -->
        <svg v-if="tab.icon === 'clipboard'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <!-- network -->
        <svg v-else-if="tab.icon === 'network'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4m-5.2 3.8L11 12m2 0l4.2 2.8"/></svg>
        <!-- map -->
        <svg v-else-if="tab.icon === 'map'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
        {{ tab.label }}
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>
