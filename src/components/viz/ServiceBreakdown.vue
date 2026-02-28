<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceScore } from '@/types'

const props = defineProps<{
  services?: ServiceScore[]
}>()

const defaultServices: ServiceScore[] = [
  { name: 'Rules Engine', score: 0, weight: 0.3 },
  { name: 'Velocity Service', score: 0, weight: 0.35 },
  { name: 'Graph Analysis', score: 0, weight: 0.35 },
]

const serviceData = computed(() => props.services ?? defaultServices)

const colors = ['#3b82f6', '#f59e0b', '#8b5cf6']

const segments = computed(() => {
  const total = serviceData.value.reduce((sum, s) => sum + s.weight, 0)
  let offset = 0
  return serviceData.value.map((s, i) => {
    const width = (s.weight / total) * 100
    const seg = { ...s, width, offset, color: colors[i % colors.length] }
    offset += width
    return seg
  })
})
</script>

<template>
  <div class="space-y-2">
    <div class="text-xs text-gray-400 font-medium uppercase tracking-wider">
      Service Breakdown
    </div>
    <!-- Stacked bar -->
    <div class="h-3 rounded-full overflow-hidden flex bg-gray-800">
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="h-full transition-all duration-500"
        :style="{
          width: seg.width + '%',
          backgroundColor: seg.color,
          opacity: 0.3 + seg.score * 0.7,
        }"
      />
    </div>
    <!-- Labels -->
    <div class="flex justify-between text-xs">
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="flex items-center gap-1.5"
      >
        <span
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: seg.color }"
        />
        <span class="text-gray-400">{{ seg.name }}</span>
        <span class="text-gray-300 font-mono">{{ seg.score.toFixed(2) }}</span>
        <span class="text-gray-600">({{ (seg.weight * 100).toFixed(0) }}%)</span>
      </div>
    </div>
  </div>
</template>
