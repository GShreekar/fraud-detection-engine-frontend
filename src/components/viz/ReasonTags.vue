<script setup lang="ts">
import { reasonDescriptions } from '@/services/scenarios'

defineProps<{
  reasons: string[]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="reason in reasons"
      :key="reason"
      class="group relative badge bg-gray-800 text-gray-300 border border-gray-700 cursor-help hover:bg-gray-700 transition-colors"
    >
      {{ reason.replace(/_/g, ' ') }}
      <!-- Tooltip -->
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl"
      >
        {{ reasonDescriptions[reason] || reason }}
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </span>
    <span v-if="reasons.length === 0" class="text-gray-600 text-sm italic">
      No risk factors detected
    </span>
  </div>
</template>
