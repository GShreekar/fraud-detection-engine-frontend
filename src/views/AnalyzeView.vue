<script setup lang="ts">
import TransactionForm from '@/components/TransactionForm.vue'
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">Analyze Transaction</h1>
      <p class="text-gray-400 mt-1">Submit a transaction for real-time fraud analysis</p>
    </div>
    <TransactionForm />
  </div>
</template>
