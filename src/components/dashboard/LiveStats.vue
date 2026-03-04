<script setup lang="ts">
import { computed } from 'vue'
import { useStreamStore } from '@/stores/streamStore'

const streamStore = useStreamStore()
const stats = computed(() => streamStore.statistics)

function pct(val: number) {
  if (stats.value.total === 0) return 0
  return (val / stats.value.total * 100).toFixed(1)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800">
      <h3 class="text-sm font-semibold text-gray-300">Live Statistics</h3>
    </div>

    <!-- Counters -->
    <div class="grid grid-cols-2 gap-3 px-3">
      <div class="card p-3 text-center">
        <div class="text-2xl font-bold text-white tabular-nums">{{ stats.total }}</div>
        <div class="text-xs text-gray-400 mt-1">Total Analyzed</div>
      </div>
      <div class="card p-3 text-center">
        <div class="text-2xl font-bold tabular-nums" :class="{
          'text-green-400': stats.avgScore < 0.4,
          'text-yellow-400': stats.avgScore >= 0.4 && stats.avgScore < 0.75,
          'text-red-400': stats.avgScore >= 0.75,
        }">
          {{ stats.avgScore.toFixed(3) }}
        </div>
        <div class="text-xs text-gray-400 mt-1">Avg Fraud Score</div>
      </div>
    </div>

    <!-- Decision Bars -->
    <div class="px-3 space-y-3">
      <!-- ALLOW -->
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-green-400 font-medium inline-flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            ALLOW
          </span>
          <span class="text-gray-400 tabular-nums">{{ stats.allow }} ({{ pct(stats.allow) }}%)</span>
        </div>
        <div class="h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full bg-green-500 transition-all duration-500"
            :style="{ width: pct(stats.allow) + '%' }"
          />
        </div>
      </div>

      <!-- REVIEW -->
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-yellow-400 font-medium inline-flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            REVIEW
          </span>
          <span class="text-gray-400 tabular-nums">{{ stats.review }} ({{ pct(stats.review) }}%)</span>
        </div>
        <div class="h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full bg-yellow-500 transition-all duration-500"
            :style="{ width: pct(stats.review) + '%' }"
          />
        </div>
      </div>

      <!-- BLOCK -->
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-red-400 font-medium inline-flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            BLOCK
          </span>
          <span class="text-gray-400 tabular-nums">{{ stats.block }} ({{ pct(stats.block) }}%)</span>
        </div>
        <div class="h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full bg-red-500 transition-all duration-500"
            :style="{ width: pct(stats.block) + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
