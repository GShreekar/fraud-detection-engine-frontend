# Performance Optimization Guide

Strategies and techniques for optimizing frontend, backend, and database performance.

## 🚀 Frontend Performance

### Bundle Size Optimization

**Analyze Bundle:**

```bash
# Build with analysis
npm run build

# Check dist folder size
du -sh dist/

# Should be <500KB gzipped total
```

**Optimization Techniques:**

1. **Code Splitting**

```typescript
// router/index.ts - Lazy load routes
const HistoryView = defineAsyncComponent(() => 
  import('@/views/HistoryView.vue')
);
```

2. **Tree Shaking**

```typescript
// ✓ Good - Imports only what's needed
import { computed } from 'vue';

// ✗ Bad - Imports entire library
import * as Vue from 'vue';
```

3. **Minification**

Built-in Vite minification in production build:

```bash
npm run build  # Automatically minifies
```

### Runtime Performance

**Render Optimization:**

```typescript
// Use computed instead of methods for reactive data
const fraudPercentage = computed(() => {
  return (stats.fraudCount / stats.totalCount) * 100;
});

// Watch specific properties
watch(() => route.query.country, (newVal) => {
  // Update only when needed
  fetchData(newVal);
});

// Unsubscribe from events
onBeforeUnmount(() => {
  socket.off('transaction');
});
```

**Component Performance:**

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// Lazy load heavy components
const NetworkGraph = defineAsyncComponent(() =>
  import('@/components/graph/NetworkGraph.vue')
);
</script>

<template>
  <!-- Use v-if to prevent rendering -->
  <NetworkGraph v-if="showGraph" :nodes="nodes" />
</template>
```

### Memory Management

**Limit History Size:**

```typescript
// In historyStore.ts
const MAX_HISTORY_SIZE = 10000;

function addTransaction(tx: Transaction) {
  if (transactions.value.length >= MAX_HISTORY_SIZE) {
    transactions.value.shift();  // Remove oldest
  }
  transactions.value.push(tx);
}
```

**Cleanup WebSocket:**

```typescript
const { on, off } = useWebSocket();

on('transaction', handleNewTransaction);

onBeforeUnmount(() => {
  off('transaction');  // Prevent memory leak
});
```

### Image & Asset Optimization

```html
<!-- Use WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="Description">
</picture>

<!-- Lazy load images -->
<img src="image.png" loading="lazy" alt="Description">
```

---

## ⚙️ Backend Performance

### Request Queuing & Concurrency

**Current Implementation:**

```javascript
const ANALYZE_MAX_CONCURRENT = 4;  // Limit concurrent requests
const ANALYZE_QUEUE_TIMEOUT_MS = 20000;  // Queue wait time

// Queue implementation prevents overwhelming Fraud API
async function acquireAnalyzeSlot(timeoutMs) {
  const start = Date.now();
  while (analyzeInFlight >= ANALYZE_MAX_CONCURRENT) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  analyzeInFlight += 1;
  return true;
}
```

**Tuning:**

```ini
# For high throughput (more concurrent requests)
ANALYZE_MAX_CONCURRENT=8

# For reliability under load (fail faster)
ANALYZE_QUEUE_TIMEOUT_MS=10000

# For slow APIs (longer timeout)
ANALYZE_QUEUE_TIMEOUT_MS=30000
```

### Circuit Breaker Pattern

**Prevents Cascading Failures:**

```javascript
let fraudApiCircuitOpenUntil = 0;

// Check before request
if (Date.now() < fraudApiCircuitOpenUntil) {
  return { error: 'Circuit breaker open' };
}

// On failure
if (apiError) {
  fraudApiCircuitOpenUntil = Date.now() + FRAUD_API_CIRCUIT_OPEN_MS;
}
```

**Tuning:**

```ini
# Circuit open time - stay open for 15 seconds
# Allows Fraud API time to recover
FRAUD_API_CIRCUIT_OPEN_MS=15000

# Request timeout - fail fast
FRAUD_API_TIMEOUT_MS=8000
```

### Express Middleware Optimization

```javascript
// ✓ Good - Minimal middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✗ Bad - Heavy middleware
app.use(bodyParser.json({ strict: false }));
app.use(compression());  // Unnecessary if using nginx
```

### Connection Pooling

```javascript
// Neo4j driver manages connection pool
const neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(...), {
  maxConnectionPoolSize: 50,  // Tune based on load
});

// Redis connection pool
const redisClient = createClient({
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  }
});
```

---

## 🗄️ Database Performance

### Neo4j Optimization

**Create Indexes:**

```cypher
-- Create index for frequently queried fields
CREATE INDEX ON :Transaction(transaction_id);
CREATE INDEX ON :Transaction(fraud_score);
CREATE INDEX ON :Transaction(timestamp);
CREATE INDEX ON :User(id);
CREATE INDEX ON :Device(id);
CREATE INDEX ON :IP(address);

-- View indexes
CALL db.indexes();
```

**Query Optimization:**

```cypher
-- ✓ Good - Uses index on fraud_score
MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t
LIMIT 100;

-- ✗ Bad - Full table scan
MATCH (t:Transaction)
WHERE toLower(t.reasons[0]) = 'high_amount'
RETURN t;

-- ✓ Better - Use APOC for string operations
CALL apoc.periodic.iterate(
  'MATCH (t:Transaction) RETURN t',
  'SET t.reason_lower = toLower(t.reasons[0])',
  {batchSize: 1000}
);
```

**Limit Query Results:**

```cypher
-- Always use LIMIT to prevent memory overflow
MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t
LIMIT 1000;  -- Don't return all rows

-- Use SKIP for pagination
MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t
SKIP 1000
LIMIT 100;
```

**Batch Operations:**

```cypher
-- ✓ Good - Batch updates
CALL apoc.periodic.iterate(
  'MATCH (t:Transaction) WHERE t.fraud_score IS NULL RETURN t',
  'SET t.fraud_score = 0.5',
  {batchSize: 10000}
);

-- ✗ Bad - Update one by one
MATCH (t:Transaction) WHERE t.fraud_score IS NULL
SET t.fraud_score = 0.5;
```

### Redis Caching

**Cache Strategy:**

```javascript
// Cache heatmap data with TTL
const HEATMAP_CACHE_TTL = 3600;  // 1 hour

// Set with expiration
await redisClient.setex(
  `heatmap:hourly:${date}`,
  HEATMAP_CACHE_TTL,
  JSON.stringify(heatmapData)
);

// Get with fallback to database
let data = await redisClient.get(`heatmap:hourly:${date}`);
if (!data) {
  data = await queryDatabase();
  await redisClient.setex(...);
}
```

**Cache Invalidation:**

```javascript
// Invalidate on new transaction
function invalidateCaches() {
  return redisClient.del([
    'heatmap:*',           // All heatmap caches
    'recent_stats:*',      // All stats caches
  ]);
}
```

**Memory Management:**

```bash
# Monitor Redis memory
redis-cli INFO memory

# Set max memory policy
redis-cli CONFIG SET maxmemory 1000000000  # 1GB
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Get memory usage
redis-cli MEMORY USAGE key_name
```

---

## 📊 Monitoring Performance

### Frontend Monitoring

**Browser DevTools:**

1. **Performance Tab**
   - Record user actions
   - Analyze bottlenecks
   - Check Long Tasks (>50ms)

2. **Network Tab**
   - Check API response times
   - Identify slow endpoints
   - Check waterfall timing

3. **Memory Tab**
   - Take heap snapshots
   - Check for leaks
   - Monitor memory growth

**Web Vitals:**

```javascript
// Measure Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getFCP(console.log);  // First Contentful Paint
getLCP(console.log);  // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

### Backend Monitoring

**Health Endpoint:**

```bash
# Check backend health
curl http://localhost:3001/api/health

# Includes latency to databases
{
  "connections": {
    "neo4j": { "latency": 2 },
    "redis": { "latency": 1 },
    "fraudApi": { "latency": 45 }
  }
}
```

**Node Profiling:**

```bash
# Start with profiling
node --prof server.js

# Process profile
node --prof-process isolate-*.log > profile.txt

# Analyze flame graph
# Use tools like clinic.js
npm install -g @clinic/doctor
clinic doctor -- node server.js
```

### Database Monitoring

**Neo4j Metrics:**

```cypher
-- Get query statistics
CALL db.stats.usageFor("MATCH");

-- Monitor connections
CALL dbms.listConnections();

-- Check memory
CALL dbms.queryJmx('java.lang:type=Memory') YIELD attributes
RETURN attributes;
```

**Redis Metrics:**

```bash
# Get all info
redis-cli INFO

# Memory stats
redis-cli INFO memory

# Key space stats
redis-cli INFO keyspace

# Monitor commands in real-time
redis-cli MONITOR

# Slow log
redis-cli SLOWLOG GET 10
```

---

## 🔄 Load Testing

### Using Apache Bench

```bash
# Simple load test
ab -n 1000 -c 10 http://localhost:3001/api/health

# Output shows:
# Requests per second
# Time per request
# Failed requests
```

### Using wrk

```bash
# Install: brew install wrk

# Load test with script
wrk -t12 -c400 -d30s \
  -s script.lua \
  http://localhost:3001/api/analyze

# script.lua:
request = function()
  body = {
    transaction_id = "txn_" .. math.random(),
    user_id = "user_test",
    amount = 250,
    -- ... other fields
  }
  return wrk.format("POST", "/api/analyze", body)
end
```

### Using k6

```bash
# Install: brew install k6

# Create test
cat > test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const payload = JSON.stringify({
    transaction_id: 'txn_' + Date.now(),
    // ... fields
  });
  
  const res = http.post('http://localhost:3001/api/analyze', payload);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}
EOF

# Run test
k6 run test.js
```

---

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API response time | <100ms | - |
| Frontend bundle | <500KB gzipped | - |
| First Contentful Paint | <2s | - |
| Time to Interactive | <3s | - |
| Transaction analysis | <500ms | - |
| Neo4j query | <50ms | - |
| Redis get | <5ms | - |

---

## 🔍 Debugging Performance

```bash
# Enable slow query logging (Neo4j)
NEO4J_dbms_logs_query_enabled=true
NEO4J_dbms_logs_query_threshold=1000  # 1 second

# Enable slow log (Redis)
redis-cli CONFIG SET slowlog-log-slower-than 1000  # 1ms
redis-cli SLOWLOG GET 10

# Enable debug logging (Backend)
DEBUG=* NODE_ENV=development npm run dev

# Memory profiling (Node.js)
node --inspect server.js
# Visit chrome://inspect to debug
```

---

**Last Updated:** March 2026
