<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useStreamStore } from '@/stores/streamStore'
import { computed } from 'vue'

const route = useRoute()
const streamStore = useStreamStore()

const navItems = [
  { to: '/', label: 'Live Dashboard', icon: 'dashboard' },
  { to: '/analyze', label: 'Analyze', icon: 'search' },
  { to: '/scenarios', label: 'Scenarios', icon: 'flask' },
  { to: '/history', label: 'History', icon: 'clipboard' },
  { to: '/network', label: 'Network', icon: 'network' },
  { to: '/heatmaps', label: 'Heatmaps', icon: 'map' },
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
            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
            <span>Fraud Detection</span>
          </RouterLink>
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              :class="route.path === item.to || route.path.startsWith(item.to + '/')
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'"
            >
              <!-- dashboard -->
              <svg v-if="item.icon === 'dashboard'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
              <!-- search -->
              <svg v-else-if="item.icon === 'search'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/></svg>
              <!-- flask -->
              <svg v-else-if="item.icon === 'flask'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3h6m-5 0v6.5L4 18.5A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-2.5L14 9.5V3"/></svg>
              <!-- clipboard -->
              <svg v-else-if="item.icon === 'clipboard'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <!-- network -->
              <svg v-else-if="item.icon === 'network'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4m-5.2 3.8L11 12m2 0l4.2 2.8"/></svg>
              <!-- map -->
              <svg v-else-if="item.icon === 'map'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
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
