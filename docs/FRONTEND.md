# Frontend Documentation

Comprehensive guide to the Vue 3 frontend application structure, components, routing, and state management.

## 📁 Project Structure

```
src/
├── App.vue                 # Root component
├── main.ts                 # Vue app initialization
├── components/
│   ├── RequestResponseModal.vue        # Request/response display modal
│   ├── TransactionDetailModal.vue      # Transaction detail modal
│   ├── TransactionForm.vue             # Form for transaction submission
│   ├── dashboard/
│   │   ├── LiveStats.vue              # KPI counters (fraud count, total, avg score)
│   │   ├── ScoreTrend.vue             # Sparkline chart of fraud scores
│   │   └── TransactionFeed.vue        # Real-time transaction list
│   ├── graph/
│   │   └── NetworkGraph.vue           # D3.js force-directed graph (User-Device-IP)
│   ├── history/
│   │   ├── HistoryGraph.vue           # Time-series chart
│   │   ├── HistoryHeatmap.vue         # Geographic heatmap (ECharts)
│   │   └── HistoryTable.vue           # Sortable/filterable transaction table
│   └── viz/
│       ├── DecisionBadge.vue          # Visual badge for fraud decision
│       ├── ReasonTags.vue             # Tag display for fraud reasons
│       ├── ScoreGauge.vue             # Gauge chart for fraud score
│       └── ServiceBreakdown.vue       # Service performance breakdown
├── composables/
│   └── useWebSocket.ts                 # WebSocket connection composable
├── router/
│   └── index.ts                        # Vue Router configuration
├── services/
│   ├── api.ts                          # API client (axios instance)
│   └── scenarios.ts                    # Pre-built test scenarios
├── stores/
│   ├── analyticsStore.ts               # Analytics state (Pinia)
│   ├── historyStore.ts                 # Transaction history state
│   └── streamStore.ts                  # Real-time stream state
├── styles/
│   └── main.css                        # Global styles & Tailwind directives
├── types/
│   └── index.ts                        # TypeScript type definitions
└── views/
    ├── AnalyzeView.vue                 # Transaction form page
    ├── HeatmapView.vue                 # Heatmap visualization page
    ├── HistoryView.vue                 # Transaction history page
    ├── LiveDashboard.vue               # Real-time dashboard
    ├── NetworkView.vue                 # Network graph page
    └── ScenarioGallery.vue             # Test scenarios page
```

---

## 🛣️ Vue Router Configuration

Routes are defined in [src/router/index.ts](../src/router/index.ts).

### Available Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` or `/dashboard` | `LiveDashboard.vue` | Real-time transaction feed and stats |
| `/analyze` | `AnalyzeView.vue` | Manual transaction submission form |
| `/scenarios` | `ScenarioGallery.vue` | Pre-built test scenarios gallery |
| `/network` | `NetworkView.vue` | D3.js force-directed graph visualization |
| `/history` | `HistoryView.vue` | Transaction history with multiple tabs |
| `/heatmap` | `HeatmapView.vue` | Geographic and temporal heatmaps |

### Navigation Example

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goToDashboard = () => {
  router.push('/dashboard');
};

const goToHistory = () => {
  router.push('/history?country=US&score=0.7');
};
</script>
```

---

## 🎯 Key Components

### LiveDashboard.vue

**Purpose:** Main dashboard showing real-time transaction stream

**Props:** None

**Emits:** None

**Features:**
- Real-time transaction feed via WebSocket
- Animated KPI counters (fraud %, average score)
- Sparkline chart showing score trends
- Play/pause stream controls
- Speed slider (0.5× to 10×)

**Example Usage:**
```vue
<LiveDashboard />
```

### TransactionForm.vue

**Purpose:** Form for submitting individual transactions for fraud analysis

**Props:**
```typescript
interface Props {
  showModal?: boolean;  // Control modal visibility
  initialData?: Partial<Transaction>;  // Pre-fill form
}
```

**Emits:**
```typescript
emit('submit', transactionData);  // Fired on form submission
emit('close');                     // Fired on modal close
```

**Features:**
- Field validation using Zod schemas
- Random payload generation (Faker.js)
- Real-time fraud analysis
- Result display with score gauge and decision badge
- Error handling with user feedback

**Example Usage:**
```vue
<script setup lang="ts">
import TransactionForm from '@/components/TransactionForm.vue';

const handleSubmit = (data: Transaction) => {
  console.log('Transaction submitted:', data);
};
</script>

<template>
  <TransactionForm @submit="handleSubmit" />
</template>
```

### NetworkGraph.vue

**Purpose:** D3.js force-directed graph showing entity relationships

**Props:**
```typescript
interface Props {
  nodes: GraphNode[];      // Node data
  links: GraphLink[];      // Edge data
  width?: number;          // SVG width (default: 100%)
  height?: number;         // SVG height (default: 600px)
}
```

**Emits:**
```typescript
emit('node-click', nodeId);  // Fired when node clicked
```

**Features:**
- Force-directed layout (d3-force)
- Zoomable and draggable
- Node highlighting on hover
- SVG export functionality
- Color-coded by entity type (User/Device/IP)

**Example Usage:**
```vue
<script setup lang="ts">
import NetworkGraph from '@/components/graph/NetworkGraph.vue';
import { ref } from 'vue';

const nodes = ref([
  { id: 'user_1', type: 'user', label: 'User 1' },
  { id: 'device_1', type: 'device', label: 'Device 1' },
  { id: 'ip_1', type: 'ip', label: '192.168.1.1' },
]);

const links = ref([
  { source: 'user_1', target: 'device_1' },
  { source: 'device_1', target: 'ip_1' },
]);

const handleNodeClick = (nodeId: string) => {
  console.log('Clicked node:', nodeId);
};
</script>

<template>
  <NetworkGraph 
    :nodes="nodes" 
    :links="links" 
    @node-click="handleNodeClick" 
  />
</template>
```

### HistoryTable.vue

**Purpose:** Sortable, filterable transaction history table

**Props:**
```typescript
interface Props {
  transactions: Transaction[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

**Emits:**
```typescript
emit('sort', { column: string; order: 'asc' | 'desc' });
emit('row-click', transaction);
emit('export');  // CSV export
```

**Features:**
- Sortable columns (click header)
- Filterable by country, score range, date
- Pagination with configurable page size
- Detail modal on row click
- CSV export
- localStorage persistence (max 10,000 records)

**Example Usage:**
```vue
<script setup lang="ts">
import { historyStore } from '@/stores/historyStore';

const store = historyStore();

const handleSort = ({ column, order }) => {
  store.setSortBy(column, order);
};
</script>

<template>
  <HistoryTable 
    :transactions="store.transactions"
    :loading="store.isLoading"
    @sort="handleSort"
  />
</template>
```

### DecisionBadge.vue

**Purpose:** Visual indicator for fraud decision (ALLOW/REVIEW/BLOCK)

**Props:**
```typescript
interface Props {
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  size?: 'sm' | 'md' | 'lg';  // default: 'md'
}
```

**Styling:**
- ALLOW: Green badge
- REVIEW: Yellow badge
- BLOCK: Red badge

**Example Usage:**
```vue
<DecisionBadge decision="REVIEW" size="lg" />
```

### ScoreGauge.vue

**Purpose:** Gauge chart displaying fraud score (0-1)

**Props:**
```typescript
interface Props {
  score: number;           // 0 to 1
  size?: number;          // diameter in pixels (default: 200)
  showLabel?: boolean;    // Show score text (default: true)
}
```

**Color Zones:**
- Green: 0 - 0.3 (Low Risk)
- Yellow: 0.3 - 0.7 (Medium Risk)
- Red: 0.7 - 1.0 (High Risk)

**Example Usage:**
```vue
<ScoreGauge :score="0.75" :size="250" />
```

---

## 📦 Pinia State Stores

### streamStore

**Purpose:** Manages real-time transaction streaming state

**State:**
```typescript
{
  isPlaying: boolean;              // Stream paused/playing
  speed: number;                   // Playback speed (0.5 - 10)
  transactions: Transaction[];     // Recent transactions
  stats: {
    fraudCount: number;
    totalCount: number;
    averageScore: number;
  };
}
```

**Actions:**
```typescript
addTransaction(transaction: Transaction) → void
updateStats(stats: Stats) → void
pause() → void
play() → void
setSpeed(speed: number) → void
clearTransactions() → void
```

**Example:**
```typescript
import { streamStore } from '@/stores/streamStore';

const store = streamStore();

store.play();           // Start stream
store.setSpeed(2);      // 2x speed
store.pause();          // Pause stream
console.log(store.transactions);  // All transactions
```

### historyStore

**Purpose:** Manages transaction history with persistence

**State:**
```typescript
{
  transactions: Transaction[];
  filters: {
    dateRange: [Date, Date];
    country?: string;
    scoreRange: [number, number];
  };
  sortBy: string;         // Column to sort by
  sortOrder: 'asc' | 'desc';
  selectedTransaction?: Transaction;
}
```

**Actions:**
```typescript
addTransaction(transaction: Transaction) → void
setFilter(filter: FilterCriteria) → void
setSortBy(column: string, order: 'asc' | 'desc') → void
exportToCSV() → void
selectTransaction(transaction: Transaction) → void
```

**Example:**
```typescript
import { historyStore } from '@/stores/historyStore';

const store = historyStore();

// Add transaction
store.addTransaction({ transaction_id: 'txn_123', ... });

// Filter
store.setFilter({ country: 'US', scoreRange: [0.7, 1.0] });

// Sort
store.setSortBy('timestamp', 'desc');

// Export
store.exportToCSV();
```

### analyticsStore

**Purpose:** Manages analytics and aggregated metrics

**State:**
```typescript
{
  heatmapData: HeatmapData;
  summaryStats: SummaryStats;
  isLoading: boolean;
  error?: string;
}
```

**Actions:**
```typescript
fetchHeatmap() → Promise<void>
fetchSummary() → Promise<void>
refreshAll() → Promise<void>
```

**Example:**
```typescript
import { analyticsStore } from '@/stores/analyticsStore';

const store = analyticsStore();

// Fetch data
await store.fetchHeatmap();
await store.fetchSummary();

// Use data
console.log(store.heatmapData);
console.log(store.summaryStats);
```

---

## 🔌 Composables

### useWebSocket

**Purpose:** Manage WebSocket connection for real-time updates

**Usage:**
```typescript
import { useWebSocket } from '@/composables/useWebSocket';

const { 
  isConnected, 
  send, 
  on, 
  off 
} = useWebSocket('ws://localhost:3001/stream');

// Listen for transactions
on('transaction', (data) => {
  console.log('New transaction:', data);
});

// Send message
send('play');  // Start stream
send('speed', { value: 2 });  // Set speed to 2x

// Clean up
off('transaction');
```

**Properties:**
```typescript
isConnected: Ref<boolean>           // Connection status
```

**Methods:**
```typescript
send(event: string, data?: any) → void
on(event: string, callback: Function) → void
off(event: string) → void
close() → void
```

---

## 🎨 Styling with Tailwind CSS

### Tailwind Setup

Configured in [tailwind.config.js](../tailwind.config.js)

**Custom Colors:**
```css
@layer components {
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700;
  }
}
```

### Common Utility Classes

```html
<!-- Flexbox -->
<div class="flex gap-4 items-center justify-between">...</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-4">...</div>

<!-- Responsive -->
<div class="md:grid-cols-2 lg:grid-cols-3">...</div>

<!-- Spacing -->
<div class="p-4 m-2 gap-6">...</div>

<!-- Colors -->
<div class="bg-blue-500 text-white border-2 border-gray-300">...</div>
```

---

## 📝 Type Definitions

### Transaction Type

```typescript
interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  timestamp: string;  // ISO 8601
  country: string;    // ISO 3166-1 alpha-2
  device_id: string;
  ip_address: string;
  merchant_id: string;
  merchant_category: string;
  payment_method: string;
  is_international: boolean;
  customer_age: number;
  account_age_days: number;
  transaction_hour: number;  // 0-23
}
```

### Analysis Result Type

```typescript
interface AnalysisResult {
  transaction_id: string;
  fraud_score: number;      // 0 to 1
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reasons: string[];
  confidence: number;       // 0 to 1
  timestamp: string;
}
```

### GraphNode Type

```typescript
interface GraphNode {
  id: string;
  type: 'user' | 'device' | 'ip' | 'merchant';
  label: string;
  value?: number;           // Size in visualization
  color?: string;
  metadata?: Record<string, any>;
}
```

See [src/types/index.ts](../src/types/index.ts) for complete type definitions.

---

## 🔗 API Integration

### API Client

Configured in [src/services/api.ts](../src/services/api.ts)

```typescript
import { api } from '@/services/api';

// Analyze transaction
const result = await api.post('/analyze', {
  transaction_id: 'txn_123',
  user_id: 'user_xyz',
  amount: 250.00,
  // ... other fields
});

// Fetch network graph
const graph = await api.get('/graph/network?depth=2');

// Fetch heatmap data
const heatmap = await api.get('/analytics/heatmap?period=daily');
```

---

## 🧪 Testing Scenarios

Pre-built scenarios defined in [src/services/scenarios.ts](../src/services/scenarios.ts)

```typescript
import { scenarios } from '@/services/scenarios';

// Submit single scenario
await scenarios[0].submit();

// Batch submit
await Promise.all(scenarios.map(s => s.submit()));
```

**Scenario Examples:**
- High amount transaction
- High-risk country
- Velocity burst (multiple transactions rapidly)
- Device sharing detected
- Unusual time of day
- International transaction
- And more...

---

## 🚀 Performance Optimization

### Component Lazy Loading

```typescript
// router/index.ts
const HistoryView = defineAsyncComponent(() => 
  import('@/views/HistoryView.vue')
);
```

### Computed Properties

```typescript
const fraudPercentage = computed(() => {
  return stats.value.fraudCount / stats.value.totalCount * 100;
});
```

### Watch vs Watcheffect

```typescript
// Targeted watch
watch(() => route.query.country, (newCountry) => {
  // Fetch data
});

// Effect with dependencies
watchEffect(() => {
  if (store.filters.country) {
    // Auto-fetch
  }
});
```

### Memory Management

- Transaction history: Max 10,000 records (configurable)
- Stream buffer: Auto-clear old transactions
- Component cleanup: OnBeforeUnmount hooks

---

## 🐛 Debugging

### Vue DevTools

1. Install [Vue DevTools extension](https://devtools.vuejs.org/)
2. Open DevTools (F12)
3. Go to Vue tab
4. Inspect components and stores

### Browser Console Tricks

```javascript
// Access Pinia store
import { streamStore } from '@/stores/streamStore';
const store = streamStore();
console.log(store.transactions);

// Check WebSocket
ws.readyState  // 0=connecting, 1=open, 2=closing, 3=closed

// Performance
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

---

## 📚 Further Reading

- [Vue 3 Docs](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [D3.js](https://d3js.org/)
- [ECharts](https://echarts.apache.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated:** March 2026
