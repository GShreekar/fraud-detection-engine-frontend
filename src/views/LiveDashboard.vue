<script setup lang="ts">
import { ref } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useStreamStore } from '@/stores/streamStore'
import TransactionFeed from '@/components/dashboard/TransactionFeed.vue'
import LiveStats from '@/components/dashboard/LiveStats.vue'
import ScoreTrend from '@/components/dashboard/ScoreTrend.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import { saveAs } from 'file-saver'
import type { TransactionRecord } from '@/types'

const streamStore = useStreamStore()
const { startStream, stopStream, setSpeed } = useWebSocket()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedTransaction = ref<TransactionRecord | null>(null)

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
        class="btn text-sm inline-flex items-center gap-1.5"
        :class="streamStore.isPlaying ? 'btn-danger' : 'btn-primary'"
      >
        <svg v-if="streamStore.isPlaying" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="4" width="4" height="12" rx="1"/><rect x="11" y="4" width="4" height="12" rx="1"/></svg>
        <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
        {{ streamStore.isPlaying ? 'Pause' : 'Play' }}
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

      <button @click="clearFeed" class="btn-ghost text-xs inline-flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        Clear
      </button>
      <button @click="exportSession" class="btn-ghost text-xs inline-flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
        Record
      </button>
      <button @click="importSession" class="btn-ghost text-xs inline-flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        Replay
      </button>
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
        <TransactionFeed @select="selectedTransaction = $event" />
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
          <div class="text-4xl mb-2 text-gray-600">
            <svg class="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          </div>
          <p class="text-sm">Stream data will appear here</p>
          <p class="text-xs mt-1">Click <strong>Play</strong> to start the real-time feed</p>
        </div>
        <div v-else class="w-full h-full">
          <ScoreTrend />
        </div>
      </div>
    </div>
  </div>

  <!-- Transaction Detail Modal -->
  <TransactionDetailModal :transaction="selectedTransaction" @close="selectedTransaction = null" />
</template>
