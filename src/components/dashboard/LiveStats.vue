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
          <span class="text-green-400 font-medium">✓ ALLOW</span>
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
          <span class="text-yellow-400 font-medium">⚠ REVIEW</span>
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
          <span class="text-red-400 font-medium">✕ BLOCK</span>
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
