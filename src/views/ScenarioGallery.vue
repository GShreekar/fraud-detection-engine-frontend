<script setup lang="ts">
import { computed, ref } from 'vue'
import { generateRandomPayload, scenarios } from '@/services/scenarios'
import { api } from '@/services/api'
import { useHistoryStore } from '@/stores/historyStore'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import ReasonTags from '@/components/viz/ReasonTags.vue'
import type { Scenario, TransactionRequest, TransactionResponse } from '@/types'

type ScenarioSuite = Scenario['suite']

type AssertionResult = {
  passed: boolean
  decisionPass: boolean
  scorePass: boolean
  reasonsPass: boolean
  missingReasons: string[]
  unexpectedReasons: string[]
}

type ScenarioRunStep = {
  request: TransactionRequest
  response?: TransactionResponse
  error?: string
}

type ScenarioRunResult = {
  scenarioId: string
  scenarioName: string
  suite: ScenarioSuite
  runAt: string
  request: TransactionRequest
  response?: TransactionResponse
  error?: string
  assertions: AssertionResult
  steps?: ScenarioRunStep[]
}

const historyStore = useHistoryStore()
const selectedSuite = ref<ScenarioSuite>('isolated')
const isRunningAll = ref(false)
const activeScenarioIds = ref<Set<string>>(new Set())
const results = ref<Map<string, ScenarioRunResult>>(new Map())
const runOrder = ref<string[]>([])
const suiteLabels: Record<ScenarioSuite, string> = {
  isolated: 'Isolated Suite',
  stateful: 'Stateful Suite',
}

const BURST_MODE_LABELS: Record<string, string> = {
  'same-user': 'same user',
  'same-device': 'same device',
  'same-ip': 'same IP',
  'same-merchant': 'same merchant',
  'country-switch': 'country switch',
  'amount-spike': 'amount spike',
  'idempotent-transaction': 'same transaction id',
  'same-user-new-device': 'same user + new device',
}

const BASE_BURST_DELAY_MS = 250
const HEAVY_BURST_DELAY_MS = 600

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function getBurstDelayMs(mode?: Scenario['burstMode']) {
  if (mode === 'amount-spike' || mode === 'same-merchant' || mode === 'same-ip') return HEAVY_BURST_DELAY_MS
  return BASE_BURST_DELAY_MS
}

function getBurstModeLabel(mode?: Scenario['burstMode']) {
  return mode ? (BURST_MODE_LABELS[mode] || mode) : 'burst'
}

function getScenarioResult(scenarioId: string) {
  return results.value.get(scenarioId)
}

const visibleScenarios = computed(() => scenarios.filter((s) => s.suite === selectedSuite.value))

function getScoreBucket(score?: number) {
  if (score === undefined) return { label: 'unknown', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
  if (score >= 0.75) return { label: 'critical', className: 'bg-red-500/20 text-red-300 border-red-500/30' }
  if (score >= 0.4) return { label: 'high', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' }
  return { label: 'low', className: 'bg-green-500/20 text-green-300 border-green-500/30' }
}

function toDeterministicTimestamp(baseTimestamp: string | undefined, stepIndex = 0) {
  const start = Date.parse(baseTimestamp || '2026-03-20T12:00:00.000Z')
  const timestampMs = Number.isFinite(start)
    ? start + stepIndex * 5000
    : Date.parse('2026-03-20T12:00:00.000Z') + stepIndex * 5000
  return new Date(timestampMs).toISOString()
}

function needsTransactionHour(scenario: Scenario) {
  return scenario.expected.mustIncludeReasons?.includes('unusual_hour') ?? false
}

function applyDeterministicTimeFields(scenario: Scenario, payload: TransactionRequest, stepIndex = 0) {
  const timestamp = toDeterministicTimestamp(payload.timestamp || scenario.payload.timestamp, stepIndex)
  payload.timestamp = timestamp
  if (needsTransactionHour(scenario)) {
    payload.transaction_hour = new Date(timestamp).getUTCHours()
  }
}

function applyIsolationIdentifiers(base: TransactionRequest, scenarioId: string, runToken: string) {
  const suffix = `${scenarioId.toLowerCase()}_${runToken}`
  return {
    ...base,
    transaction_id: `${base.transaction_id}_${suffix}`,
    user_id: `${base.user_id}_${suffix}`,
    device_id: `${base.device_id}_${suffix}`,
    merchant_id: `${base.merchant_id}_${suffix}`,
    ip_address: `198.18.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
  }
}

function evaluateAssertions(scenario: Scenario, response?: TransactionResponse): AssertionResult {
  if (!response) {
    return {
      passed: false,
      decisionPass: false,
      scorePass: false,
      reasonsPass: false,
      missingReasons: scenario.expected.mustIncludeReasons || [],
      unexpectedReasons: [],
    }
  }

  const decisionPass = response.decision === scenario.expected.decision
  const scorePass = response.fraud_score >= scenario.expected.scoreMin && response.fraud_score <= scenario.expected.scoreMax

  const expectedReasons = scenario.expected.mustIncludeReasons || []
  const missingReasons = expectedReasons.filter((reason) => !response.reasons.includes(reason))
  const unexpectedReasons = expectedReasons.length
    ? response.reasons.filter((reason) => !expectedReasons.includes(reason))
    : []
  const subsetPass = missingReasons.length === 0
  const reasonsPass = scenario.expected.allowExtraReasons === false
    ? subsetPass && unexpectedReasons.length === 0
    : subsetPass

  return {
    passed: decisionPass && scorePass && reasonsPass,
    decisionPass,
    scorePass,
    reasonsPass,
    missingReasons,
    unexpectedReasons,
  }
}

async function runSingleScenario(scenario: Scenario) {
  const runToken = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  activeScenarioIds.value.add(scenario.id)

  try {
    const basePayload: TransactionRequest = { ...generateRandomPayload(), ...scenario.payload }
    const preparedBase = scenario.suite === 'isolated'
      ? applyIsolationIdentifiers(basePayload, scenario.id, runToken)
      : basePayload

    if (scenario.burstCount && scenario.burstCount > 1) {
      const steps: ScenarioRunStep[] = []
      const total = scenario.burstCount
      const switchCountries = scenario.countrySequence?.length
        ? scenario.countrySequence
        : ['US', 'GB', 'DE', 'FR', 'JP', 'CA']

      const pinnedUserId = preparedBase.user_id
      const pinnedDeviceId = preparedBase.device_id
      const pinnedIpAddress = preparedBase.ip_address
      const pinnedMerchantId = preparedBase.merchant_id
      const pinnedTransactionId = preparedBase.transaction_id

      for (let i = 0; i < total; i++) {
        let request: TransactionRequest = {
          ...preparedBase,
          transaction_id: `${preparedBase.transaction_id}_${i + 1}`,
        }

        if (scenario.burstMode === 'same-user') {
          request = { ...request, user_id: pinnedUserId, ip_address: pinnedIpAddress }
        } else if (scenario.burstMode === 'same-device') {
          request = { ...request, user_id: `${preparedBase.user_id}_${i + 1}`, device_id: pinnedDeviceId }
        } else if (scenario.burstMode === 'same-ip') {
          request = {
            ...request,
            user_id: `${preparedBase.user_id}_${i + 1}`,
            device_id: `${preparedBase.device_id}_${i + 1}`,
            ip_address: pinnedIpAddress,
          }
        } else if (scenario.burstMode === 'same-merchant') {
          request = {
            ...request,
            user_id: `${preparedBase.user_id}_${i + 1}`,
            device_id: `${preparedBase.device_id}_${i + 1}`,
            merchant_id: pinnedMerchantId,
          }
        } else if (scenario.burstMode === 'country-switch') {
          const country = i === 0 ? preparedBase.country : switchCountries[i % switchCountries.length]
          request = {
            ...request,
            user_id: pinnedUserId,
            device_id: pinnedDeviceId,
            ip_address: pinnedIpAddress,
            country,
            is_international: country !== 'US',
          }
        } else if (scenario.burstMode === 'amount-spike') {
          const amount = scenario.amountSequence?.[i] ?? (i < total - 1 ? 25 + i * 5 : 600)
          request = {
            ...request,
            user_id: pinnedUserId,
            device_id: pinnedDeviceId,
            ip_address: pinnedIpAddress,
            amount,
          }
        } else if (scenario.burstMode === 'idempotent-transaction') {
          request = {
            ...request,
            transaction_id: pinnedTransactionId,
            user_id: pinnedUserId,
            device_id: pinnedDeviceId,
            ip_address: pinnedIpAddress,
          }
        }

        if (scenario.amountSequence?.[i] !== undefined) {
          request.amount = scenario.amountSequence[i]
        }

        applyDeterministicTimeFields(scenario, request, i)

        try {
          const response = await api.analyzeTransaction(request)
          steps.push({ request, response })
          historyStore.addTransaction({
            id: request.transaction_id,
            request,
            response,
            submittedAt: new Date().toISOString(),
          })
        } catch (err: any) {
          steps.push({ request, error: err?.message || 'Failed' })
        }

        if (i < total - 1) await sleep(getBurstDelayMs(scenario.burstMode))
      }

      const lastSuccess = [...steps].reverse().find((step) => step.response)
      const request = lastSuccess?.request || steps[steps.length - 1].request
      const response = lastSuccess?.response
      const error = response ? undefined : steps[steps.length - 1].error || 'No successful response'
      const assertions = evaluateAssertions(scenario, response)

      const run: ScenarioRunResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        suite: scenario.suite,
        runAt: new Date().toISOString(),
        request,
        response,
        error,
        assertions,
        steps,
      }
      results.value.set(scenario.id, run)
      runOrder.value = [scenario.id, ...runOrder.value.filter((id) => id !== scenario.id)]
      return
    }

    const request = { ...preparedBase }
    applyDeterministicTimeFields(scenario, request, 0)
    const response = await api.analyzeTransaction(request)
    historyStore.addTransaction({
      id: request.transaction_id,
      request,
      response,
      submittedAt: new Date().toISOString(),
    })
    const assertions = evaluateAssertions(scenario, response)
    const run: ScenarioRunResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      suite: scenario.suite,
      runAt: new Date().toISOString(),
      request,
      response,
      assertions,
    }
    results.value.set(scenario.id, run)
    runOrder.value = [scenario.id, ...runOrder.value.filter((id) => id !== scenario.id)]
  } catch (err: any) {
    const fallbackRequest = { ...generateRandomPayload(), ...scenario.payload } as TransactionRequest
    applyDeterministicTimeFields(scenario, fallbackRequest, 0)
    const assertions = evaluateAssertions(scenario, undefined)
    const run: ScenarioRunResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      suite: scenario.suite,
      runAt: new Date().toISOString(),
      request: fallbackRequest,
      error: err?.message || 'Failed',
      assertions,
    }
    results.value.set(scenario.id, run)
    runOrder.value = [scenario.id, ...runOrder.value.filter((id) => id !== scenario.id)]
  } finally {
    activeScenarioIds.value.delete(scenario.id)
  }
}

async function runAllInSuite() {
  if (isRunningAll.value) return
  isRunningAll.value = true
  try {
    for (const scenario of visibleScenarios.value) {
      await runSingleScenario(scenario)
    }
  } finally {
    isRunningAll.value = false
  }
}

function downloadJsonReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    suite: selectedSuite.value,
    scenarios: visibleScenarios.value.map((scenario) => {
      const run = results.value.get(scenario.id)
      return {
        scenario: {
          id: scenario.id,
          name: scenario.name,
          suite: scenario.suite,
          expected: scenario.expected,
          payload: scenario.payload,
        },
        run,
      }
    }),
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `scenario-report-${selectedSuite.value}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Scenario Runner</h1>
        <p class="text-gray-400 mt-1">Run isolated and stateful fraud scenarios with deterministic assertions</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="selectedSuite = 'isolated'"
          class="btn-outline text-xs"
          :class="selectedSuite === 'isolated' ? 'ring-2 ring-blue-500/40' : ''"
        >
          Isolated Suite
        </button>
        <button
          @click="selectedSuite = 'stateful'"
          class="btn-outline text-xs"
          :class="selectedSuite === 'stateful' ? 'ring-2 ring-blue-500/40' : ''"
        >
          Stateful Suite
        </button>
        <button class="btn-primary text-xs" :disabled="isRunningAll" @click="runAllInSuite">
          {{ isRunningAll ? 'Running…' : `Run all (${suiteLabels[selectedSuite]})` }}
        </button>
        <button class="btn-outline text-xs" @click="downloadJsonReport">
          Download JSON report
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="scenario in visibleScenarios" :key="scenario.id" class="card-hover">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <div class="text-[11px] text-gray-500 font-mono">{{ scenario.id }}</div>
            <h2 class="text-sm font-semibold text-white">{{ scenario.name }}</h2>
          </div>
          <DecisionBadge :decision="scenario.expected.decision" size="sm" />
        </div>
        <p class="text-xs text-gray-400 mb-3">{{ scenario.description }}</p>

        <div class="flex flex-wrap gap-1.5 mb-3">
          <span
            v-if="scenario.burstCount"
            class="text-[10px] px-2 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30"
          >
            {{ scenario.burstCount }}× burst · {{ getBurstModeLabel(scenario.burstMode) }}
          </span>
        </div>

        <button
          class="btn-primary text-xs mb-3"
          :disabled="isRunningAll || activeScenarioIds.has(scenario.id)"
          @click="runSingleScenario(scenario)"
        >
          {{ activeScenarioIds.has(scenario.id) ? 'Running…' : 'Run one' }}
        </button>

        <div
          v-if="getScenarioResult(scenario.id)"
          class="rounded-lg bg-gray-900/40 border border-gray-800 p-3 text-xs"
        >
          <div
            v-if="getScenarioResult(scenario.id)?.error"
            class="text-red-300 mb-2"
          >
            {{ getScenarioResult(scenario.id)?.error }}
          </div>

          <div
            v-if="getScenarioResult(scenario.id)?.response"
            class="flex flex-wrap gap-2 mb-2"
          >
            <DecisionBadge
              :decision="getScenarioResult(scenario.id)!.response!.decision"
              size="sm"
            />
            <span
              class="text-[10px] px-2 py-0.5 rounded border"
              :class="getScoreBucket(getScenarioResult(scenario.id)!.response!.fraud_score).className"
            >
              {{ getScoreBucket(getScenarioResult(scenario.id)!.response!.fraud_score).label }}
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded border border-gray-600 text-gray-300">
              score {{ getScenarioResult(scenario.id)!.response!.fraud_score.toFixed(4) }}
            </span>
          </div>

          <div
            v-if="getScenarioResult(scenario.id)?.response"
            class="mb-2"
          >
            <div class="text-[11px] text-gray-500 mb-1">
              Triggered reasons
            </div>
            <ReasonTags :reasons="getScenarioResult(scenario.id)!.response!.reasons" />
          </div>

          <details class="mt-2">
            <summary class="cursor-pointer text-blue-300">
              Request payload
            </summary>
            <pre class="mt-1 p-2 rounded bg-gray-950 text-[10px] text-gray-300 overflow-x-auto">{{ formatJson(getScenarioResult(scenario.id)!.request) }}</pre>
          </details>

          <details
            v-if="getScenarioResult(scenario.id)?.response"
            class="mt-2"
          >
            <summary class="cursor-pointer text-blue-300">
              Response payload
            </summary>
            <pre class="mt-1 p-2 rounded bg-gray-950 text-[10px] text-gray-300 overflow-x-auto">{{ formatJson(getScenarioResult(scenario.id)!.response) }}</pre>
          </details>

          <details
            v-if="getScenarioResult(scenario.id)?.steps?.length"
            class="mt-2"
          >
            <summary class="cursor-pointer text-blue-300">
              Burst steps ({{ getScenarioResult(scenario.id)?.steps?.length }})
            </summary>
            <pre class="mt-1 p-2 rounded bg-gray-950 text-[10px] text-gray-300 overflow-x-auto">{{ formatJson(getScenarioResult(scenario.id)?.steps) }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>
