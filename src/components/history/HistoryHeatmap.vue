<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import { init, use } from 'echarts/core'
import { HeatmapChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts } from 'echarts/core'

use([HeatmapChart, BarChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

const historyStore = useHistoryStore()
const geoRef = ref<HTMLDivElement | null>(null)
const timeRef = ref<HTMLDivElement | null>(null)
let geoChart: ECharts | null = null
let timeChart: ECharts | null = null

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`)

const geoData = computed(() => {
  const map = new Map<string, { total: number; score: number }>()
  historyStore.transactions.forEach((tx) => {
    const c = tx.request.country
    const existing = map.get(c) || { total: 0, score: 0 }
    existing.total++
    existing.score += tx.response.fraud_score
    map.set(c, existing)
  })
  return Array.from(map.entries())
    .map(([country, data]) => ({
      country,
      avgScore: data.score / data.total,
      count: data.total,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
})

const timeData = computed(() => {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  historyStore.transactions.forEach((tx) => {
    const date = new Date(tx.submittedAt)
    const day = (date.getDay() + 6) % 7 // Monday = 0
    const hour = date.getHours()
    grid[day][hour] += tx.response.fraud_score
    counts[day][hour]++
  })

  const data: [number, number, number][] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const avg = counts[d][h] > 0 ? grid[d][h] / counts[d][h] : 0
      data.push([h, d, +avg.toFixed(3)])
    }
  }
  return data
})

function renderGeoChart() {
  if (!geoRef.value) return
  if (!geoChart) geoChart = init(geoRef.value, 'dark')

  geoChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb' },
    },
    grid: { top: 10, bottom: 30, left: 60, right: 20 },
    xAxis: {
      type: 'value',
      max: 1,
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'category',
      data: geoData.value.map((d) => d.country).reverse(),
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: geoData.value.map((d) => d.avgScore).reverse(),
      itemStyle: {
        color: (params: any) => {
          const v = params.value
          if (v < 0.4) return '#22c55e'
          if (v < 0.75) return '#eab308'
          return '#ef4444'
        },
      },
    }],
  })
}

function renderTimeChart() {
  if (!timeRef.value) return
  if (!timeChart) timeChart = init(timeRef.value, 'dark')

  timeChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb' },
      formatter: (params: any) => {
        const [h, d, s] = params.value
        return `${dayLabels[d]} ${hourLabels[h]}<br/>Avg Score: ${s}`
      },
    },
    grid: { top: 10, bottom: 60, left: 70, right: 20 },
    xAxis: {
      type: 'category',
      data: hourLabels,
      axisLabel: { color: '#9ca3af', fontSize: 9 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: dayLabels,
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#22c55e', '#eab308', '#ef4444'] },
      textStyle: { color: '#9ca3af' },
    },
    series: [{
      type: 'heatmap',
      data: timeData.value,
      label: { show: false },
    }],
  })
}

watch(geoData, renderGeoChart, { deep: true })
watch(timeData, renderTimeChart, { deep: true })

onMounted(() => {
  renderGeoChart()
  renderTimeChart()
})
</script>

<template>
  <div v-if="historyStore.transactions.length === 0" class="card text-center py-12 text-gray-600">
    <div class="text-3xl mb-2">🗺️</div>
    <p>No transaction data for heatmap</p>
  </div>
  <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card">
      <h3 class="text-sm font-semibold text-gray-300 mb-3">🌍 Country Risk Scores</h3>
      <div ref="geoRef" class="h-[400px]" />
    </div>
    <div class="card">
      <h3 class="text-sm font-semibold text-gray-300 mb-3">🕐 Time-of-Day Patterns</h3>
      <div ref="timeRef" class="h-[400px]" />
    </div>
  </div>
</template>
