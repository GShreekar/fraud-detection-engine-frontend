<script setup lang="ts">
const props = withDefaults(defineProps<{
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

const iconSizes: Record<string, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}

const decisionClasses: Record<string, string> = {
  ALLOW: 'bg-green-500/20 text-green-400 border-green-500/30',
  REVIEW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BLOCK: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse-border',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide"
    :class="[sizeClasses[size], decisionClasses[decision]]"
  >
    <!-- ALLOW check icon -->
    <svg v-if="decision === 'ALLOW'" :class="iconSizes[size]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
    <!-- REVIEW warning icon -->
    <svg v-else-if="decision === 'REVIEW'" :class="iconSizes[size]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    <!-- BLOCK X icon -->
    <svg v-else :class="iconSizes[size]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    <span>{{ decision }}</span>
  </span>
</template>
