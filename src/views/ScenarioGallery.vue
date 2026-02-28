<script setup lang="ts">
import { ref } from 'vue'
import { scenarios, generateRandomPayload } from '@/services/scenarios'
import { api } from '@/services/api'
import { useHistoryStore } from '@/stores/historyStore'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import type { TransactionRequest } from '@/types'

const historyStore = useHistoryStore()
const submittingIds = ref<Set<string>>(new Set())
const results = ref<Map<string, any>>(new Map())

async function submitScenario(scenarioId: string, payload: Partial<TransactionRequest>) {
  submittingIds.value.add(scenarioId)
  try {
    const fullPayload: TransactionRequest = { ...generateRandomPayload(), ...payload }
    const result = await api.analyzeTransaction(fullPayload)
    results.value.set(scenarioId, result)
    historyStore.addTransaction({
      id: fullPayload.transaction_id,
      request: fullPayload,
      response: result,
      submittedAt: new Date().toISOString(),
    })
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
          <p class="text-gray-400 text-xs mb-4 flex-1">{{ scenario.description }}</p>

          <!-- Result -->
          <div
            v-if="results.get(scenario.id)"
            class="mb-3 p-2 rounded-lg bg-gray-800/50 text-xs"
          >
            <template v-if="results.get(scenario.id).error">
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
            </template>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mt-auto">
            <button
              @click="submitScenario(scenario.id, scenario.payload)"
              class="btn-primary text-xs flex-1"
              :disabled="submittingIds.has(scenario.id)"
            >
              {{ submittingIds.has(scenario.id) ? '⏳' : '▶' }} Submit
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
</template>
