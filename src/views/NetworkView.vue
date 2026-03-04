<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import NetworkGraph from '@/components/graph/NetworkGraph.vue'
import type { GraphNode } from '@/types'

const analyticsStore = useAnalyticsStore()
const filterUserId = ref('')
const graphRef = ref<InstanceType<typeof NetworkGraph> | null>(null)
const selectedNodeInfo = ref<GraphNode | null>(null)

onMounted(() => {
  analyticsStore.fetchGraphData()
})

function refresh() {
  const params = filterUserId.value ? { user_id: filterUserId.value } : undefined
  analyticsStore.fetchGraphData(params)
}

function onNodeClick(node: GraphNode) {
  selectedNodeInfo.value = node
}
</script>

<template>
  <div class="max-w-[1920px] mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Fraud Network Graph</h1>
        <p class="text-gray-400 mt-1">Explore relationships between users, devices, and IP addresses</p>
      </div>
      <div class="flex items-center gap-3">
        <input
          v-model="filterUserId"
          placeholder="Filter by user_id..."
          class="input w-48"
          @keyup.enter="refresh"
        />
        <button @click="refresh" class="btn-primary text-sm">Load Graph</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="analyticsStore.isLoadingGraph" class="card flex items-center justify-center h-96">
      <div class="text-gray-400 animate-pulse">Loading graph data...</div>
    </div>

    <!-- Error -->
    <div v-else-if="analyticsStore.graphError" class="card border-red-500/30 bg-red-500/5 p-6">
      <p class="text-red-400">{{ analyticsStore.graphError }}</p>
      <button @click="refresh" class="btn-primary text-sm mt-3">Retry</button>
    </div>

    <!-- Graph -->
    <div v-else class="relative">
      <NetworkGraph
        ref="graphRef"
        :data="analyticsStore.graphData"
        :width="1200"
        :height="700"
        @refresh="refresh"
        @node-click="onNodeClick"
      />

      <!-- Node Info Panel -->
      <Transition name="slide">
        <div
          v-if="selectedNodeInfo"
          class="absolute bottom-4 left-4 card p-4 w-72 z-20"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-white text-sm">{{ selectedNodeInfo.type }}</h4>
            <button @click="selectedNodeInfo = null" class="text-gray-500 hover:text-gray-300">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-1 text-xs">
            <div><span class="text-gray-400">ID:</span> <span class="text-gray-200 font-mono">{{ selectedNodeInfo.id }}</span></div>
            <div><span class="text-gray-400">Label:</span> <span class="text-gray-200">{{ selectedNodeInfo.label }}</span></div>
            <div v-for="(val, key) in selectedNodeInfo.properties" :key="String(key)">
              <span class="text-gray-400">{{ key }}:</span> <span class="text-gray-200">{{ val }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
