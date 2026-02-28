<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  score: number
  size?: number
}>(), {
  size: 120,
})

const radius = computed(() => (props.size - 12) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => circumference.value * (1 - props.score))

const color = computed(() => {
  if (props.score < 0.4) return '#22c55e'
  if (props.score < 0.75) return '#eab308'
  return '#ef4444'
})

const bgColor = computed(() => {
  if (props.score < 0.4) return 'rgba(34, 197, 94, 0.1)'
  if (props.score < 0.75) return 'rgba(234, 179, 8, 0.1)'
  return 'rgba(239, 68, 68, 0.1)'
})

const label = computed(() => {
  if (props.score < 0.4) return 'Low Risk'
  if (props.score < 0.75) return 'Medium Risk'
  return 'High Risk'
})
</script>

<template>
  <div class="inline-flex flex-col items-center gap-1">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="transform -rotate-90"
    >
      <!-- Background circle -->
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="bgColor"
        stroke-width="8"
      />
      <!-- Score arc -->
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        stroke-width="8"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-all duration-700 ease-out"
      />
      <!-- Center text -->
      <text
        :x="size / 2"
        :y="size / 2 - 4"
        text-anchor="middle"
        dominant-baseline="central"
        class="transform rotate-90 origin-center"
        :fill="color"
        :font-size="size * 0.22"
        font-weight="bold"
      >
        {{ score.toFixed(2) }}
      </text>
      <text
        :x="size / 2"
        :y="size / 2 + size * 0.14"
        text-anchor="middle"
        dominant-baseline="central"
        class="transform rotate-90 origin-center"
        fill="#9ca3af"
        :font-size="size * 0.09"
      >
        {{ label }}
      </text>
    </svg>
  </div>
</template>
