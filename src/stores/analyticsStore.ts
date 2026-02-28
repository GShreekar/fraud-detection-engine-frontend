import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GraphData, HeatmapCell } from '@/types'
import { api } from '@/services/api'

export const useAnalyticsStore = defineStore('analytics', () => {
  const graphData = ref<GraphData>({ nodes: [], edges: [] })
  const geoHeatmap = ref<HeatmapCell[]>([])
  const temporalHeatmap = ref<HeatmapCell[]>([])
  const isLoadingGraph = ref(false)
  const isLoadingHeatmap = ref(false)
  const graphError = ref<string | null>(null)
  const heatmapError = ref<string | null>(null)

  async function fetchGraphData(params?: { user_id?: string; transaction_id?: string; limit?: number }) {
    isLoadingGraph.value = true
    graphError.value = null
    try {
      const data = await api.getGraphNetwork(params)
      graphData.value = data
    } catch (err: any) {
      graphError.value = err.message || 'Failed to fetch graph data'
    } finally {
      isLoadingGraph.value = false
    }
  }

  async function fetchHeatmapData(range: string = '7d') {
    isLoadingHeatmap.value = true
    heatmapError.value = null
    try {
      const data = await api.getHeatmapData(range)
      geoHeatmap.value = data.geographic
      temporalHeatmap.value = data.temporal
    } catch (err: any) {
      heatmapError.value = err.message || 'Failed to fetch heatmap data'
    } finally {
      isLoadingHeatmap.value = false
    }
  }

  return {
    graphData,
    geoHeatmap,
    temporalHeatmap,
    isLoadingGraph,
    isLoadingHeatmap,
    graphError,
    heatmapError,
    fetchGraphData,
    fetchHeatmapData,
  }
})
