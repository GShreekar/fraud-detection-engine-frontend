<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { TransactionRequest, TransactionResponse } from '@/types'
import { api } from '@/services/api'
import { generateRandomPayload } from '@/services/scenarios'
import { useHistoryStore } from '@/stores/historyStore'
import ScoreGauge from '@/components/viz/ScoreGauge.vue'
import DecisionBadge from '@/components/viz/DecisionBadge.vue'
import ReasonTags from '@/components/viz/ReasonTags.vue'
import ServiceBreakdown from '@/components/viz/ServiceBreakdown.vue'

const historyStore = useHistoryStore()

const COUNTRIES = [
  'US', 'GB', 'DE', 'FR', 'JP', 'CA', 'AU', 'BR', 'IN', 'NG',
  'RU', 'CN', 'MX', 'ZA', 'KE', 'KR', 'SG', 'AE', 'NL', 'IT',
]

const form = reactive<TransactionRequest>(generateRandomPayload())

const isSubmitting = ref(false)
const response = ref<TransactionResponse | null>(null)
const error = ref<string | null>(null)

function fillRandom() {
  const payload = generateRandomPayload()
  Object.assign(form, payload)
  response.value = null
  error.value = null
}

async function submit() {
  isSubmitting.value = true
  error.value = null
  response.value = null

  try {
    const result = await api.analyzeTransaction(form)
    response.value = result
    historyStore.addTransaction({
      id: form.transaction_id,
      request: { ...form },
      response: result,
      submittedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Failed to analyze transaction'
  } finally {
    isSubmitting.value = false
  }
}

function loadPayload(payload: Partial<TransactionRequest>) {
  const base = generateRandomPayload()
  Object.assign(form, base, payload)
  response.value = null
  error.value = null
}

defineExpose({ loadPayload })
</script>

<template>
  <div class="space-y-6">
    <!-- Form -->
    <form @submit.prevent="submit" class="card space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">Transaction Details</h2>
        <button type="button" @click="fillRandom" class="btn-ghost text-sm">
          🎲 Generate Random
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Transaction ID -->
        <div>
          <label class="label">Transaction ID</label>
          <input v-model="form.transaction_id" class="input" required />
        </div>
        <!-- User ID -->
        <div>
          <label class="label">User ID</label>
          <input v-model="form.user_id" class="input" required />
        </div>
        <!-- Amount -->
        <div>
          <label class="label">Amount</label>
          <input v-model.number="form.amount" type="number" step="0.01" min="0.01" class="input" required />
        </div>
        <!-- Currency -->
        <div>
          <label class="label">Currency</label>
          <input v-model="form.currency" class="input" maxlength="3" required />
        </div>
        <!-- Country -->
        <div>
          <label class="label">Country (ISO 3166-1 alpha-2)</label>
          <select v-model="form.country" class="input" required>
            <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <!-- Device ID -->
        <div>
          <label class="label">Device ID</label>
          <input v-model="form.device_id" class="input" required />
        </div>
        <!-- IP Address -->
        <div>
          <label class="label">IP Address</label>
          <input v-model="form.ip_address" class="input" required />
        </div>
        <!-- Merchant Category -->
        <div>
          <label class="label">Merchant Category</label>
          <select v-model="form.merchant_category" class="input" required>
            <option v-for="cat in ['retail','electronics','food_delivery','travel','gambling','crypto_exchange','luxury_goods','groceries']" :key="cat" :value="cat">
              {{ cat.replace(/_/g, ' ') }}
            </option>
          </select>
        </div>
        <!-- Payment Method -->
        <div>
          <label class="label">Payment Method</label>
          <select v-model="form.payment_method" class="input" required>
            <option v-for="m in ['credit_card','debit_card','digital_wallet','bank_transfer','crypto']" :key="m" :value="m">
              {{ m.replace(/_/g, ' ') }}
            </option>
          </select>
        </div>
        <!-- Customer Age -->
        <div>
          <label class="label">Customer Age</label>
          <input v-model.number="form.customer_age" type="number" min="18" max="120" class="input" required />
        </div>
        <!-- Account Age Days -->
        <div>
          <label class="label">Account Age (days)</label>
          <input v-model.number="form.account_age_days" type="number" min="0" class="input" required />
        </div>
        <!-- Is International -->
        <div class="flex items-end pb-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.is_international" type="checkbox" class="w-4 h-4 rounded bg-gray-800 border-gray-600" />
            <span class="text-sm text-gray-300">International Transaction</span>
          </label>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          class="btn-primary"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting" class="animate-spin">⏳</span>
          <span v-else>🔍</span>
          {{ isSubmitting ? 'Analyzing...' : 'Analyze Transaction' }}
        </button>
      </div>
    </form>

    <!-- Error -->
    <div v-if="error" class="card border-red-500/50 bg-red-500/10">
      <p class="text-red-400 font-medium">⚠️ {{ error }}</p>
    </div>

    <!-- Response -->
    <div v-if="response" class="card space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">Analysis Result</h2>
        <DecisionBadge :decision="response.decision" size="lg" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Score Gauge -->
        <div class="flex justify-center">
          <ScoreGauge :score="response.fraud_score" :size="160" />
        </div>

        <!-- Details -->
        <div class="md:col-span-2 space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-400">Transaction ID:</span>
              <span class="ml-2 text-white font-mono">{{ response.transaction_id }}</span>
            </div>
            <div>
              <span class="text-gray-400">Processing Time:</span>
              <span class="ml-2 text-white">{{ response.processing_time_ms }}ms</span>
            </div>
            <div>
              <span class="text-gray-400">Risk Level:</span>
              <span class="ml-2 text-white capitalize">{{ response.risk_level }}</span>
            </div>
          </div>

          <div>
            <div class="text-sm text-gray-400 mb-2">Risk Factors</div>
            <ReasonTags :reasons="response.reasons" />
          </div>
        </div>
      </div>

      <!-- Service Breakdown -->
      <ServiceBreakdown :services="response.service_scores" />
    </div>
  </div>
</template>
