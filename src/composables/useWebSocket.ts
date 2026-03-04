import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useStreamStore } from '@/stores/streamStore'
import { useHistoryStore } from '@/stores/historyStore'
import type { TransactionRecord } from '@/types'

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30000

export function useWebSocket() {
  const streamStore = useStreamStore()
  const historyStore = useHistoryStore()
  const error = ref<string | null>(null)

  function connect() {
    if (socket?.connected) return

    streamStore.setConnectionStatus('connecting')

    socket = io(`${SOCKET_URL}/stream`, {
      transports: ['websocket', 'polling'],
      reconnection: false, // we handle reconnection manually
    })

    socket.on('connect', () => {
      console.log('[WS] Connected')
      streamStore.setConnectionStatus('connected')
      reconnectAttempts = 0
      error.value = null
    })

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
      streamStore.setConnectionStatus('disconnected')
      streamStore.setPlaying(false)
      scheduleReconnect()
    })

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message)
      error.value = err.message
      streamStore.setConnectionStatus('disconnected')
      scheduleReconnect()
    })

    socket.on('transaction', (tx: any) => {
      const record: TransactionRecord = {
        id: tx.transaction_id || tx.response?.transaction_id || crypto.randomUUID(),
        request: tx.request,
        response: tx.response,
        submittedAt: new Date().toISOString(),
      }
      streamStore.addTransaction(record)
      historyStore.addTransaction(record)
    })

    socket.on('status', (status: { playing: boolean; speed: number }) => {
      streamStore.setPlaying(status.playing)
    })
  }

  function scheduleReconnect() {
    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY)
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`)
    setTimeout(() => {
      if (!socket?.connected) {
        connect()
      }
    }, delay)
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    streamStore.setConnectionStatus('disconnected')
  }

  function startStream() {
    socket?.emit('start')
    streamStore.setPlaying(true)
  }

  function stopStream() {
    socket?.emit('stop')
    streamStore.setPlaying(false)
  }

  function setSpeed(multiplier: number) {
    streamStore.setSpeed(multiplier)
    socket?.emit('setSpeed', multiplier)
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    // Don't disconnect on unmount — keep connection alive
  })

  return {
    error,
    connect,
    disconnect,
    startStream,
    stopStream,
    setSpeed,
  }
}
