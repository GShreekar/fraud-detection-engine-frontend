<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import type { GraphNode, GraphEdge, GraphData } from '@/types'

const props = withDefaults(defineProps<{
  data: GraphData
  width?: number
  height?: number
}>(), {
  width: 1200,
  height: 800,
})

const emit = defineEmits<{
  nodeClick: [node: GraphNode]
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const selectedNode = ref<string | null>(null)
const nodeCount = ref({ User: 0, Device: 0, IPAddress: 0, Transaction: 0 })

// Node visual config
const nodeConfig: Record<string, { color: string; size: number; shape: string }> = {
  User: { color: '#3b82f6', size: 12, shape: 'circle' },
  Device: { color: '#f97316', size: 16, shape: 'rect' },
  IPAddress: { color: '#a855f7', size: 10, shape: 'triangle' },
  Transaction: { color: '#6b7280', size: 6, shape: 'circle' },
}

const edgeConfig: Record<string, { color: string; dash: string }> = {
  PERFORMED: { color: '#6b7280', dash: '' },
  USED_DEVICE: { color: '#f97316', dash: '5,3' },
  ORIGINATED_FROM: { color: '#a855f7', dash: '2,3' },
}

let simulation: d3.Simulation<any, any> | null = null

function renderGraph() {
  if (!svgRef.value || !props.data.nodes.length) return

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const { width, height } = props
  const nodes = props.data.nodes.map((d) => ({ ...d }))
  const links = props.data.edges.map((d) => ({ ...d }))

  // Count nodes by type
  nodeCount.value = { User: 0, Device: 0, IPAddress: 0, Transaction: 0 }
  nodes.forEach((n) => {
    if (n.type in nodeCount.value) {
      nodeCount.value[n.type as keyof typeof nodeCount.value]++
    }
  })

  // Create container group for zoom
  const g = svg.append('g')

  // Zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Force simulation
  simulation = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius((d: any) => {
      const config = nodeConfig[d.type] || nodeConfig.Transaction
      return config.size + 5
    }))

  // Draw edges
  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', (d: any) => edgeConfig[d.type]?.color || '#4b5563')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', (d: any) => edgeConfig[d.type]?.dash || '')
    .attr('opacity', 0.6)

  // Draw nodes
  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('cursor', 'pointer')
    .call(d3.drag<any, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation!.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation!.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    )

  // Render shapes
  node.each(function (this: SVGGElement, d: any) {
    const el = d3.select(this)
    const config = nodeConfig[d.type] || nodeConfig.Transaction

    if (config.shape === 'circle') {
      el.append('circle')
        .attr('r', config.size)
        .attr('fill', config.color)
        .attr('fill-opacity', 0.8)
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4)
    } else if (config.shape === 'rect') {
      el.append('rect')
        .attr('width', config.size)
        .attr('height', config.size)
        .attr('x', -config.size / 2)
        .attr('y', -config.size / 2)
        .attr('rx', 3)
        .attr('fill', config.color)
        .attr('fill-opacity', 0.8)
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4)
    } else if (config.shape === 'triangle') {
      const s = config.size
      el.append('path')
        .attr('d', `M0,${-s} L${s},${s} L${-s},${s}Z`)
        .attr('fill', config.color)
        .attr('fill-opacity', 0.8)
        .attr('stroke', config.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4)
    }

    // Label
    el.append('text')
      .text(d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label)
      .attr('dy', config.size + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', 9)
      .attr('pointer-events', 'none')
  })

  // Click handler
  node.on('click', (event, d: any) => {
    event.stopPropagation()
    selectedNode.value = d.id

    // Highlight connected
    const connected = new Set<string>()
    links.forEach((l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      if (src === d.id) connected.add(tgt)
      if (tgt === d.id) connected.add(src)
    })
    connected.add(d.id)

    node.attr('opacity', (n: any) => connected.has(n.id) ? 1 : 0.15)
    link.attr('opacity', (l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      return (src === d.id || tgt === d.id) ? 0.8 : 0.05
    })

    emit('nodeClick', d)
  })

  // Deselect on background click
  svg.on('click', () => {
    selectedNode.value = null
    node.attr('opacity', 1)
    link.attr('opacity', 0.6)
  })

  // Tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })
}

function resetZoom() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.transition().duration(500).call(
    d3.zoom<SVGSVGElement, unknown>().transform as any,
    d3.zoomIdentity,
  )
}

function centerGraph() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  const { width, height } = props
  svg.transition().duration(500).call(
    d3.zoom<SVGSVGElement, unknown>().transform as any,
    d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2),
  )
}

function exportSVG() {
  if (!svgRef.value) return
  const svgData = new XMLSerializer().serializeToString(svgRef.value)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fraud-network-graph.svg'
  a.click()
  URL.revokeObjectURL(url)
}

watch(() => props.data, renderGraph, { deep: true })
onMounted(renderGraph)
onUnmounted(() => simulation?.stop())

defineExpose({ resetZoom, centerGraph, exportSVG })
</script>

<template>
  <div class="relative">
    <!-- Toolbar -->
    <div class="absolute top-3 right-3 z-10 flex gap-2">
      <button @click="$emit('refresh')" class="btn-ghost text-xs">🔄 Refresh</button>
      <button @click="resetZoom" class="btn-ghost text-xs">🔍 Reset Zoom</button>
      <button @click="centerGraph" class="btn-ghost text-xs">⊙ Center</button>
      <button @click="exportSVG" class="btn-ghost text-xs">📥 Export SVG</button>
    </div>

    <!-- Legend -->
    <div class="absolute top-3 left-3 z-10 card p-3 space-y-1.5 text-xs">
      <div class="font-semibold text-gray-300 mb-2">Legend</div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-blue-500" /> User ({{ nodeCount.User }})
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-orange-500" /> Device ({{ nodeCount.Device }})
      </div>
      <div class="flex items-center gap-2">
        <span class="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-transparent border-b-purple-500" /> IP Address ({{ nodeCount.IPAddress }})
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-gray-500" /> Transaction ({{ nodeCount.Transaction }})
      </div>
      <div class="mt-2 pt-2 border-t border-gray-800 space-y-1">
        <div class="flex items-center gap-2"><span class="w-6 border-t border-gray-500" /> PERFORMED</div>
        <div class="flex items-center gap-2"><span class="w-6 border-t border-orange-500 border-dashed" /> USED_DEVICE</div>
        <div class="flex items-center gap-2"><span class="w-6 border-t border-purple-500 border-dotted" /> ORIGINATED_FROM</div>
      </div>
    </div>

    <!-- SVG Canvas -->
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full bg-gray-950 rounded-lg border border-gray-800"
      style="min-height: 500px"
    />
  </div>
</template>
