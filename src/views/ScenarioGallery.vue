<script setup lang="ts">
import { ref } from 'vue'
import { scenarios, generateRandomPayload } from '@/services/scenarios'
import { api } from '@/services/api'
import { useHistoryStore } from '@/stores/historyStore'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import type { TransactionRequest, Scenario, TransactionRecord } from '@/types'

const historyStore = useHistoryStore()
const submittingIds = ref<Set<string>>(new Set())
const results = ref<Map<string, any>>(new Map())
const burstProgress = ref<Map<string, { current: number; total: number }>>(new Map())
const expandedResults = ref<Set<string>>(new Set())
const selectedTransaction = ref<TransactionRecord | null>(null)

function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id)
}

async function submitScenario(scenarioId: string, payload: Partial<TransactionRequest>) {
  const scenario = getScenario(scenarioId)
  if (!scenario) return

  submittingIds.value.add(scenarioId)

  try {
    // Burst mode: send multiple transactions with pinned fields
    if (scenario.burstCount && scenario.burstCount > 1) {
      const total = scenario.burstCount
      burstProgress.value.set(scenarioId, { current: 0, total })

      // Generate a stable base payload for deterministic burst behavior
      const burstRunId = Date.now().toString(36)
      const basePayload: TransactionRequest = {
        ...generateRandomPayload(),
        ...payload,
        country: payload.country ?? 'US',
        is_international: payload.is_international ?? false,
        account_age_days: payload.account_age_days ?? 365,
        customer_age: payload.customer_age ?? 32,
        payment_method: payload.payment_method ?? 'credit_card',
      }
      const pinnedUserId = basePayload.user_id
      const pinnedIpAddress = basePayload.ip_address
      // Use a fresh device id per run so past runs don't contaminate shared-device scenario
      const pinnedDeviceId = scenario.burstMode === 'same-device'
        ? `${payload.device_id || basePayload.device_id}_${burstRunId}`
        : (payload.device_id || basePayload.device_id)

      const allResults: any[] = []

      for (let i = 0; i < total; i++) {
        const iterPayload: TransactionRequest = {
          ...basePayload,
          transaction_id: `${basePayload.transaction_id}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        }
        let fullPayload: TransactionRequest

        if (scenario.burstMode === 'same-user') {
          // Velocity burst: same user_id and ip_address, different transaction_ids
          fullPayload = { ...iterPayload, user_id: pinnedUserId, ip_address: pinnedIpAddress }
        } else if (scenario.burstMode === 'same-device') {
          // Shared device: different user_ids, same (fresh-per-run) device_id
          fullPayload = { ...iterPayload, user_id: `${basePayload.user_id}_${i + 1}`, device_id: pinnedDeviceId }
        } else {
          fullPayload = { ...iterPayload }
        }

        try {
          const result = await api.analyzeTransaction(fullPayload)
          allResults.push({ request: fullPayload, response: result })
          historyStore.addTransaction({
            id: fullPayload.transaction_id,
            request: fullPayload,
            response: result,
            submittedAt: new Date().toISOString(),
          })
        } catch (err: any) {
          allResults.push({ request: fullPayload, error: err.message || 'Failed' })
        }

        burstProgress.value.set(scenarioId, { current: i + 1, total })
        // Small delay between rapid submissions
        if (i < total - 1) await new Promise((r) => setTimeout(r, 100))
      }

      // Store the last result (most likely to trigger) and burst summary
      const lastSuccess = [...allResults].reverse().find((r) => r.response)
      const summary = {
        ...(lastSuccess?.response || { error: 'All requests failed' }),
        _burst: {
          total,
          results: allResults.map((r) => ({
            transaction_id: r.request.transaction_id,
            user_id: r.request.user_id,
            device_id: r.request.device_id,
            fraud_score: r.response?.fraud_score,
            decision: r.response?.decision,
            error: r.error,
          })),
        },
        _lastRequest: lastSuccess?.request || allResults[allResults.length - 1]?.request,
        _lastResponse: lastSuccess?.response,
      }
      results.value.set(scenarioId, summary)
      burstProgress.value.delete(scenarioId)
    } else {
      // Single submission
      const fullPayload: TransactionRequest = { ...generateRandomPayload(), ...payload }
      const result = await api.analyzeTransaction(fullPayload)
      results.value.set(scenarioId, {
        ...result,
        _lastRequest: fullPayload,
        _lastResponse: result,
      })
      historyStore.addTransaction({
        id: fullPayload.transaction_id,
        request: fullPayload,
        response: result,
        submittedAt: new Date().toISOString(),
      })
    }
  } catch (err: any) {
    results.value.set(scenarioId, { error: err.message || 'Failed' })
  } finally {
    submittingIds.value.delete(scenarioId)
  }
}

async function autoSubmit(scenarioId: string, payload: Partial<TransactionRequest>, count: number = 10) {
  for (let i = 0; i < count; i++) {
    await submitScenario(scenarioId, payload)
    await new Promise((r) => setTimeout(r, 200))
  }
}

function toggleExpand(scenarioId: string) {
  if (expandedResults.value.has(scenarioId)) {
    expandedResults.value.delete(scenarioId)
  } else {
    expandedResults.value.add(scenarioId)
  }
}

function showTransactionDetail(scenarioId: string, transactionIndex: number) {
  const result = results.value.get(scenarioId)
  if (!result?._burst) return
  
  const burstResult = result._burst.results[transactionIndex]
  if (!burstResult) return
  
  // Find the full transaction in history store
  const fullTx = historyStore.transactions.find((t) => t.request.transaction_id === burstResult.transaction_id)
  if (fullTx) {
    selectedTransaction.value = fullTx
  }
}

function getBurstSummary(burstResults: any[]) {
  const counts = { ALLOW: 0, REVIEW: 0, BLOCK: 0, ERROR: 0 }
  const scores = burstResults.filter((r) => r.fraud_score !== undefined).map((r) => r.fraud_score)
  
  burstResults.forEach((r) => {
    if (r.error) counts.ERROR++
    else if (r.decision) counts[r.decision as keyof typeof counts]++
  })
  
  const maxScore = scores.length ? Math.max(...scores) : 0
  return { counts, maxScore, avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 }
}

const categories = [...new Set(scenarios.map((s) => s.category))]

function scenariosByCategory(category: string) {
  return scenarios.filter((s) => s.category === category)
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">Test Scenarios</h1>
      <p class="text-gray-400 mt-1">Pre-built scenarios for testing fraud detection rules</p>
    </div>

    <div v-for="category in categories" :key="category" class="mb-8">
      <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {{ category }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="scenario in scenariosByCategory(category)"
          :key="scenario.id"
          class="card-hover flex flex-col"
        >
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-white text-sm">{{ scenario.name }}</h3>
            <DecisionBadge :decision="scenario.expectedDecision" size="sm" />
          </div>
          <p class="text-gray-400 text-xs mb-2 flex-1">{{ scenario.description }}</p>

          <!-- Burst badge -->
          <div v-if="scenario.burstCount" class="mb-3">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {{ scenario.burstCount }}× burst &middot; {{ scenario.burstMode === 'same-user' ? 'same user' : 'same device' }}
            </span>
          </div>

          <!-- Burst Progress -->
          <div v-if="burstProgress.get(scenario.id)" class="mb-3">
            <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Sending burst...</span>
              <span>{{ burstProgress.get(scenario.id)!.current }}/{{ burstProgress.get(scenario.id)!.total }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-150"
                :style="{ width: (burstProgress.get(scenario.id)!.current / burstProgress.get(scenario.id)!.total * 100) + '%' }"
              />
            </div>
          </div>

          <!-- Result -->
          <div
            v-if="results.get(scenario.id)"
            class="mb-3 p-2 rounded-lg bg-gray-800/50 text-xs"
          >
            <template v-if="results.get(scenario.id).error && !results.get(scenario.id)._burst">
              <span class="text-red-400">{{ results.get(scenario.id).error }}</span>
            </template>
            <template v-else>
              <div class="flex items-center justify-between">
                <span class="text-gray-400">Score:</span>
                <span class="font-mono text-white">{{ results.get(scenario.id).fraud_score?.toFixed(4) }}</span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-gray-400">Decision:</span>
                <DecisionBadge :decision="results.get(scenario.id).decision" size="sm" />
              </div>

              <!-- Burst summary -->
              <div v-if="results.get(scenario.id)._burst" class="mt-2 pt-2 border-t border-gray-700">
                <div class="text-[10px] text-gray-500 mb-2">Burst: {{ results.get(scenario.id)._burst.total }} transactions</div>
                
                <!-- Decision counts -->
                <div class="mb-2 p-1.5 bg-gray-900/30 rounded text-[10px] space-y-0.5">
                  <div v-if="getBurstSummary(results.get(scenario.id)._burst.results).counts.BLOCK > 0" class="flex justify-between">
                    <span class="text-red-400">🔴 BLOCK:</span>
                    <span class="text-red-300 font-mono">{{ getBurstSummary(results.get(scenario.id)._burst.results).counts.BLOCK }}</span>
                  </div>
                  <div v-if="getBurstSummary(results.get(scenario.id)._burst.results).counts.REVIEW > 0" class="flex justify-between">
                    <span class="text-yellow-400">🟡 REVIEW:</span>
                    <span class="text-yellow-300 font-mono">{{ getBurstSummary(results.get(scenario.id)._burst.results).counts.REVIEW }}</span>
                  </div>
                  <div v-if="getBurstSummary(results.get(scenario.id)._burst.results).counts.ALLOW > 0" class="flex justify-between">
                    <span class="text-green-400">🟢 ALLOW:</span>
                    <span class="text-green-300 font-mono">{{ getBurstSummary(results.get(scenario.id)._burst.results).counts.ALLOW }}</span>
                  </div>
                  <div v-if="getBurstSummary(results.get(scenario.id)._burst.results).maxScore" class="flex justify-between pt-1 border-t border-gray-700">
                    <span class="text-gray-400">Max Score:</span>
                    <span class="text-gray-300 font-mono">{{ getBurstSummary(results.get(scenario.id)._burst.results).maxScore.toFixed(3) }}</span>
                  </div>
                </div>

                <!-- Transaction squares -->
                <div class="flex gap-1 flex-wrap">
                  <button
                    v-for="(r, idx) in results.get(scenario.id)._burst.results"
                    :key="idx"
                    @click="showTransactionDetail(scenario.id, idx)"
                    class="w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-mono cursor-pointer hover:scale-125 transition-transform"
                    :class="{
                      'bg-green-500/30 text-green-400': r.decision === 'ALLOW',
                      'bg-yellow-500/30 text-yellow-400': r.decision === 'REVIEW',
                      'bg-red-500/30 text-red-400': r.decision === 'BLOCK',
                      'bg-gray-700 text-gray-500': r.error,
                    }"
                    :title="`#${idx + 1}: ${r.decision || 'ERR'} (${r.fraud_score?.toFixed(3) || 'N/A'})`"
                  >
                    {{ idx + 1 }}
                  </button>
                </div>
              </div>

              <!-- Expand/Collapse detail -->
              <button
                @click="toggleExpand(scenario.id)"
                class="mt-2 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg :class="{ 'rotate-90': expandedResults.has(scenario.id) }" class="w-3 h-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {{ expandedResults.has(scenario.id) ? 'Hide' : 'Show' }} Request / Response
              </button>

              <!-- Expanded detail -->
              <div v-if="expandedResults.has(scenario.id)" class="mt-2 space-y-2">
                <div>
                  <div class="text-[10px] text-gray-500 mb-0.5 font-semibold">Request:</div>
                  <pre class="p-2 bg-gray-900 rounded text-[10px] text-gray-300 overflow-x-auto max-h-40 overflow-y-auto">{{ JSON.stringify(results.get(scenario.id)._lastRequest, null, 2) }}</pre>
                </div>
                <div>
                  <div class="text-[10px] text-gray-500 mb-0.5 font-semibold">Response:</div>
                  <pre class="p-2 bg-gray-900 rounded text-[10px] text-gray-300 overflow-x-auto max-h-40 overflow-y-auto">{{ JSON.stringify(results.get(scenario.id)._lastResponse, null, 2) }}</pre>
                </div>
              </div>
            </template>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mt-auto">
            <button
              @click="submitScenario(scenario.id, scenario.payload)"
              class="btn-primary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
              :disabled="submittingIds.has(scenario.id)"
            >
              <template v-if="submittingIds.has(scenario.id)">
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </template>
              <template v-else>
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
              </template>
              {{ scenario.burstCount ? `Send ${scenario.burstCount}×` : 'Submit' }}
            </button>
            <button
              @click="autoSubmit(scenario.id, scenario.payload)"
              class="btn-outline text-xs"
              :disabled="submittingIds.has(scenario.id)"
            >
              10× Auto
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Transaction Detail Modal -->
  <TransactionDetailModal :transaction="selectedTransaction" @close="selectedTransaction = null" />
</template>
