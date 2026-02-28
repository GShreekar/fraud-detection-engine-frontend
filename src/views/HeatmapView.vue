<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { init, use } from 'echarts/core'
import { MapChart, HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CalendarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts } from 'echarts/core'

use([MapChart, HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CalendarComponent, CanvasRenderer])

const analyticsStore = useAnalyticsStore()
const geoChartRef = ref<HTMLDivElement | null>(null)
const timeChartRef = ref<HTMLDivElement | null>(null)
const selectedRange = ref('7d')
let geoChart: ECharts | null = null
let timeChart: ECharts | null = null

const ranges = [
  { label: 'Last 24h', value: '1d' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'All Time', value: '365d' },
]

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`)

function renderGeoChart() {
  if (!geoChartRef.value) return
  if (!geoChart) {
    geoChart = init(geoChartRef.value, 'dark')
  }

  const data = analyticsStore.geoHeatmap.map((d) => ({
    name: d.country,
    value: d.avgScore,
    count: d.count,
  }))

  geoChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: (params: any) => {
        const d = data.find((x) => x.name === params.name)
        if (!d) return params.name
        return `<strong>${params.name}</strong><br/>Avg Score: ${d.value.toFixed(3)}<br/>Transactions: ${d.count}`
      },
    },
    visualMap: {
      min: 0,
      max: 1,
      text: ['High Risk', 'Low Risk'],
      realtime: false,
      calculable: true,
      inRange: {
        color: ['#22c55e', '#eab308', '#ef4444'],
      },
      textStyle: { color: '#9ca3af' },
      left: 'left',
      bottom: 20,
    },
    series: [{
      name: 'Fraud Score by Country',
      type: 'map',
      map: 'world',
      roam: true,
      emphasis: {
        label: { show: true, color: '#fff' },
        itemStyle: { areaColor: '#1e40af' },
      },
      itemStyle: {
        areaColor: '#1f2937',
        borderColor: '#374151',
      },
      data,
    }],
  })
}

function renderTimeChart() {
  if (!timeChartRef.value) return
  if (!timeChart) {
    timeChart = init(timeChartRef.value, 'dark')
  }

  const data = analyticsStore.temporalHeatmap.map((d) => [d.hour, d.day, d.avgScore])

  timeChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: (params: any) => {
        const [hour, day, score] = params.value
        return `<strong>${dayLabels[day]} ${hourLabels[hour]}</strong><br/>Avg Score: ${score.toFixed(3)}`
      },
    },
    grid: {
      top: 20,
      bottom: 60,
      left: 80,
      right: 40,
    },
    xAxis: {
      type: 'category',
      data: hourLabels,
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: dayLabels,
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#22c55e', '#eab308', '#ef4444'],
      },
      textStyle: { color: '#9ca3af' },
    },
    series: [{
      name: 'Fraud Score',
      type: 'heatmap',
      data,
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
      },
    }],
  })
}

function loadData() {
  analyticsStore.fetchHeatmapData(selectedRange.value)
}

watch(() => analyticsStore.geoHeatmap, renderGeoChart, { deep: true })
watch(() => analyticsStore.temporalHeatmap, renderTimeChart, { deep: true })

watch(selectedRange, loadData)

onMounted(() => {
  loadData()

  const resizeObserver = new ResizeObserver(() => {
    geoChart?.resize()
    timeChart?.resize()
  })

  if (geoChartRef.value) resizeObserver.observe(geoChartRef.value)
  if (timeChartRef.value) resizeObserver.observe(timeChartRef.value)
})
</script>

<template>
  <div class="max-w-[1920px] mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Heatmaps & Analytics</h1>
        <p class="text-gray-400 mt-1">Geographic and temporal fraud pattern analysis</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="range in ranges"
          :key="range.value"
          @click="selectedRange = range.value"
          class="btn text-xs"
          :class="selectedRange === range.value ? 'btn-primary' : 'btn-ghost'"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="analyticsStore.isLoadingHeatmap" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card h-96 animate-pulse bg-gray-900" />
      <div class="card h-96 animate-pulse bg-gray-900" />
    </div>

    <!-- Error -->
    <div v-else-if="analyticsStore.heatmapError" class="card border-red-500/30 bg-red-500/5 p-6">
      <p class="text-red-400">{{ analyticsStore.heatmapError }}</p>
      <button @click="loadData" class="btn-primary text-sm mt-3">Retry</button>
    </div>

    <!-- Charts -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Geographic Heatmap -->
      <div class="card">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">🌍 Geographic Fraud Distribution</h3>
        <div ref="geoChartRef" class="h-[400px]" />
      </div>

      <!-- Time-of-Day Heatmap -->
      <div class="card">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">🕐 Time-of-Day Fraud Patterns</h3>
        <div ref="timeChartRef" class="h-[400px]" />
      </div>
    </div>

    <!-- Country table -->
    <div class="card mt-6">
      <h3 class="text-sm font-semibold text-gray-300 mb-3">Country Risk Scores</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 text-left border-b border-gray-800">
              <th class="pb-2 font-medium">Country</th>
              <th class="pb-2 font-medium">Avg Score</th>
              <th class="pb-2 font-medium">Transactions</th>
              <th class="pb-2 font-medium">Risk Bar</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in analyticsStore.geoHeatmap"
              :key="item.country"
              class="border-b border-gray-800/50 hover:bg-gray-800/30"
            >
              <td class="py-2 text-white font-medium">{{ item.country }}</td>
              <td class="py-2 font-mono" :class="{
                'text-green-400': item.avgScore < 0.4,
                'text-yellow-400': item.avgScore >= 0.4 && item.avgScore < 0.75,
                'text-red-400': item.avgScore >= 0.75,
              }">
                {{ item.avgScore.toFixed(3) }}
              </td>
              <td class="py-2 text-gray-400">{{ item.count }}</td>
              <td class="py-2">
                <div class="w-32 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="{
                      'bg-green-500': item.avgScore < 0.4,
                      'bg-yellow-500': item.avgScore >= 0.4 && item.avgScore < 0.75,
                      'bg-red-500': item.avgScore >= 0.75,
                    }"
                    :style="{ width: (item.avgScore * 100) + '%' }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
