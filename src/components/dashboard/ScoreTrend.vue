<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useStreamStore } from '@/stores/streamStore'
import { init, use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts } from 'echarts/core'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const streamStore = useStreamStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: ECharts | null = null

const scores = computed(() => streamStore.recentScores)

function getOption() {
  const data = scores.value
  return {
    animation: true,
    animationDuration: 300,
    grid: { top: 8, right: 8, bottom: 20, left: 35 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb', fontSize: 11 },
      formatter: (params: any) => {
        const val = params[0]?.value ?? 0
        return `Score: <strong>${val.toFixed(4)}</strong>`
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((_, i) => i),
      show: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      splitLine: { lineStyle: { color: '#1f2937' } },
      axisLabel: { color: '#6b7280', fontSize: 10 },
    },
    series: [{
      type: 'line',
      data,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: '#3b82f6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          { yAxis: 0.4, lineStyle: { color: '#22c55e', type: 'dashed', width: 1 } },
          { yAxis: 0.75, lineStyle: { color: '#ef4444', type: 'dashed', width: 1 } },
        ],
        label: { show: false },
      },
    }],
  }
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance = init(chartRef.value, 'dark')
    chartInstance.setOption(getOption())

    const resizeObserver = new ResizeObserver(() => chartInstance?.resize())
    resizeObserver.observe(chartRef.value)
  }
})

watch(scores, () => {
  chartInstance?.setOption(getOption())
}, { deep: true })
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800">
      <h3 class="text-sm font-semibold text-gray-300">Fraud Score Trend</h3>
      <span class="text-xs text-gray-500">Last {{ scores.length }} transactions</span>
    </div>
    <div ref="chartRef" class="flex-1 min-h-[200px]" />
  </div>
</template>
