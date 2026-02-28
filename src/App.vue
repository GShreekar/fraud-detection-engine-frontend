<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useStreamStore } from '@/stores/streamStore'
import { computed } from 'vue'

const route = useRoute()
const streamStore = useStreamStore()

const navItems = [
  { to: '/', label: 'Live Dashboard', icon: '📊' },
  { to: '/analyze', label: 'Analyze', icon: '🔍' },
  { to: '/scenarios', label: 'Scenarios', icon: '🧪' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/network', label: 'Network', icon: '🕸️' },
  { to: '/heatmaps', label: 'Heatmaps', icon: '🗺️' },
]

const connectionColor = computed(() => {
  switch (streamStore.connectionStatus) {
    case 'connected': return 'bg-green-500'
    case 'connecting': return 'bg-yellow-500'
    default: return 'bg-red-500'
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top Navigation -->
    <header class="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div class="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-2 text-white font-bold text-lg">
            <span class="text-red-500">⚡</span>
            <span>Fraud Detection</span>
          </RouterLink>
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="route.path === item.to || route.path.startsWith(item.to + '/')
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'"
            >
              <span class="mr-1.5">{{ item.icon }}</span>
              {{ item.label }}
            </RouterLink>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              :class="connectionColor"
            />
            {{ streamStore.connectionStatus }}
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
