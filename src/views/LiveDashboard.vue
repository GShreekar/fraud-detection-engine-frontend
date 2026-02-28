<script setup lang="ts">
import { ref } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useStreamStore } from '@/stores/streamStore'
import TransactionFeed from '@/components/dashboard/TransactionFeed.vue'
import LiveStats from '@/components/dashboard/LiveStats.vue'
import ScoreTrend from '@/components/dashboard/ScoreTrend.vue'
import { saveAs } from 'file-saver'

const streamStore = useStreamStore()
const { startStream, stopStream, setSpeed } = useWebSocket()
const fileInput = ref<HTMLInputElement | null>(null)

function togglePlay() {
  if (streamStore.isPlaying) {
    stopStream()
  } else {
    startStream()
  }
}

function handleSpeedChange(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  setSpeed(val)
}

function clearFeed() {
  streamStore.clearTransactions()
}

function exportSession() {
  const json = streamStore.exportSession()
  const blob = new Blob([json], { type: 'application/json' })
  saveAs(blob, `fraud-session-${Date.now()}.json`)
}

function importSession() {
  fileInput.value?.click()
}

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    streamStore.importSession(reader.result as string)
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col">
    <!-- Control Panel -->
    <div class="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-4 flex-shrink-0">
      <button
        @click="togglePlay"
        class="btn text-sm"
        :class="streamStore.isPlaying ? 'btn-danger' : 'btn-primary'"
      >
        {{ streamStore.isPlaying ? '⏸ Pause' : '▶ Play' }}
      </button>

      <!-- Speed Slider -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400">Speed:</label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          :value="streamStore.speed"
          @input="handleSpeedChange"
          class="w-24 accent-blue-500"
        />
        <span class="text-xs text-gray-300 tabular-nums w-10">{{ streamStore.speed }}×</span>
      </div>

      <div class="w-px h-6 bg-gray-700" />

      <button @click="clearFeed" class="btn-ghost text-xs">🗑 Clear</button>
      <button @click="exportSession" class="btn-ghost text-xs">💾 Record</button>
      <button @click="importSession" class="btn-ghost text-xs">📂 Replay</button>
      <input ref="fileInput" type="file" accept=".json" @change="handleFileUpload" class="hidden" />

      <div class="flex-1" />

      <!-- Connection Status -->
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <span
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-green-500': streamStore.connectionStatus === 'connected',
            'bg-yellow-500 animate-pulse': streamStore.connectionStatus === 'connecting',
            'bg-red-500': streamStore.connectionStatus === 'disconnected',
          }"
        />
        {{ streamStore.connectionStatus }}
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="flex-1 grid grid-cols-12 grid-rows-2 gap-px bg-gray-800 overflow-hidden">
      <!-- Transaction Feed - Left -->
      <div class="col-span-5 row-span-2 bg-gray-950 overflow-hidden">
        <TransactionFeed />
      </div>

      <!-- Live Stats - Top Right -->
      <div class="col-span-3 bg-gray-950 overflow-y-auto">
        <LiveStats />
      </div>

      <!-- Score Trend - Top Right -->
      <div class="col-span-4 bg-gray-950 overflow-hidden">
        <ScoreTrend />
      </div>

      <!-- Empty bottom right panels with summary data -->
      <div class="col-span-7 bg-gray-950 p-4 flex items-center justify-center overflow-hidden">
        <div class="text-center text-gray-600" v-if="streamStore.statistics.total === 0">
          <div class="text-4xl mb-2">📊</div>
          <p class="text-sm">Stream data will appear here</p>
          <p class="text-xs mt-1">Click <strong>Play</strong> to start the real-time feed</p>
        </div>
        <div v-else class="w-full h-full">
          <ScoreTrend />
        </div>
      </div>
    </div>
  </div>
</template>
