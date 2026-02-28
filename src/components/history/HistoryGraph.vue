<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import NetworkGraph from '@/components/graph/NetworkGraph.vue'
import type { GraphData, GraphNode, GraphEdge } from '@/types'

const historyStore = useHistoryStore()

// Build graph data from history
const graphData = computed<GraphData>(() => {
  const nodesMap = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  const txs = historyStore.transactions.slice(0, 200) // limit for perf

  txs.forEach((tx) => {
    const userId = tx.request.user_id
    const deviceId = tx.request.device_id
    const ipAddr = tx.request.ip_address
    const txId = tx.request.transaction_id

    if (!nodesMap.has(userId)) {
      nodesMap.set(userId, { id: userId, type: 'User', label: userId })
    }
    if (!nodesMap.has(deviceId)) {
      nodesMap.set(deviceId, { id: deviceId, type: 'Device', label: deviceId })
    }
    if (!nodesMap.has(ipAddr)) {
      nodesMap.set(ipAddr, { id: ipAddr, type: 'IPAddress', label: ipAddr })
    }
    if (!nodesMap.has(txId)) {
      nodesMap.set(txId, {
        id: txId,
        type: 'Transaction',
        label: txId,
        properties: { amount: tx.request.amount, decision: tx.response.decision },
      })
    }

    edges.push({ source: userId, target: txId, type: 'PERFORMED' })
    edges.push({ source: txId, target: deviceId, type: 'USED_DEVICE' })
    edges.push({ source: txId, target: ipAddr, type: 'ORIGINATED_FROM' })
  })

  return { nodes: Array.from(nodesMap.values()), edges }
})
</script>

<template>
  <div>
    <div v-if="historyStore.transactions.length === 0" class="card text-center py-12 text-gray-600">
      <div class="text-3xl mb-2">🕸️</div>
      <p>No transaction data to visualize</p>
      <p class="text-xs mt-1">Submit or stream some transactions first</p>
    </div>
    <NetworkGraph
      v-else
      :data="graphData"
      :width="1200"
      :height="700"
    />
  </div>
</template>
