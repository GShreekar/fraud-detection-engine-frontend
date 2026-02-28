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

const decisionClasses: Record<string, string> = {
  ALLOW: 'bg-green-500/20 text-green-400 border-green-500/30',
  REVIEW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BLOCK: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse-border',
}

const icons: Record<string, string> = {
  ALLOW: '✓',
  REVIEW: '⚠',
  BLOCK: '✕',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide"
    :class="[sizeClasses[size], decisionClasses[decision]]"
  >
    <span>{{ icons[decision] }}</span>
    <span>{{ decision }}</span>
  </span>
</template>
