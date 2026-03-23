# Backend Documentation

Complete guide to the Express.js backend server, API endpoints, middleware, and integrations.

## 🏗️ Backend Architecture

```
Backend (Express.js + Socket.IO)
├── HTTP Server (Port 3001)
│   ├── Express App
│   │   ├── Middleware (CORS, Morgan, JSON parser)
│   │   └── Routes & Controllers
│   └── Socket.IO Server (/stream namespace)
│
├── Integrations
│   ├── Fraud Detection API (Python, :8000)
│   ├── Neo4j Database (bolt://:7687)
│   └── Redis Cache (redis://:6379)
│
└── Features
    ├── Request Queuing (concurrency control)
    ├── Circuit Breaker (fault tolerance)
    ├── Transaction Persistence
    ├── Cache Invalidation
    └── Real-time Streaming
```

---

## 📁 Backend Project Structure

```
backend/
├── package.json              # Dependencies
├── server.js                 # Main server file
└── services/
    └── stream.js             # WebSocket streaming logic
```

---

## 🔧 Server Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `FRAUD_API_URL` | http://localhost:8000 | Fraud API endpoint |
| `NEO4J_URI` | bolt://localhost:7687 | Neo4j connection |
| `NEO4J_USER` | neo4j | Neo4j username |
| `NEO4J_PASSWORD` | password | Neo4j password |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `ANALYZE_MAX_CONCURRENT` | 4 | Max concurrent API requests |
| `ANALYZE_QUEUE_TIMEOUT_MS` | 20000 | Queue timeout (ms) |
| `FRAUD_API_TIMEOUT_MS` | 8000 | API timeout (ms) |
| `FRAUD_API_CIRCUIT_OPEN_MS` | 15000 | Circuit breaker timeout (ms) |
| `CORS_ORIGIN` | * | Allowed CORS origins |

### Middleware Stack

```javascript
// CORS - Cross-origin requests
app.use(cors());

// Morgan - HTTP request logging
app.use(morgan('short'));

// JSON parser - Parse request bodies
app.use(express.json());
```

---

## 🔌 API Endpoints

### POST /api/analyze

Analyze a transaction for fraud risk.

**Request:**
```json
{
  "transaction_id": "txn_abc123",
  "user_id": "user_xyz",
  "amount": 250.00,
  "currency": "USD",
  "timestamp": "2026-03-23T10:30:00Z",
  "country": "US",
  "device_id": "dev_123",
  "ip_address": "192.168.1.100",
  "merchant_id": "merchant_1",
  "merchant_category": "electronics",
  "payment_method": "credit_card",
  "is_international": false,
  "customer_age": 35,
  "account_age_days": 730,
  "transaction_hour": 10
}
```

**Response (Success):**
```json
{
  "transaction_id": "txn_abc123",
  "fraud_score": 0.75,
  "decision": "REVIEW",
  "reasons": [
    "high_amount_transaction",
    "unusual_time_of_day",
    "device_sharing_detected"
  ],
  "confidence": 0.92,
  "timestamp": "2026-03-23T10:30:00Z"
}
```

**Response (Queue Timeout):**
```json
{
  "error": "Queue timeout - too many concurrent requests",
  "statusCode": 503
}
```

**Response (Circuit Open):**
```json
{
  "error": "Service unavailable - circuit breaker open",
  "statusCode": 503
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `500` - Server error
- `503` - Service unavailable (queue timeout or circuit open)

---

### GET /api/graph/network

Fetch network graph data (user-device-IP relationships).

**Query Parameters:**
```
?user_id=user_xyz      # Filter by user (optional)
?depth=2               # Relationship depth (default: 2)
?limit=100             # Max nodes (default: 100)
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "user_1",
      "type": "user",
      "label": "user_1",
      "transactions": 45
    },
    {
      "id": "device_1",
      "type": "device",
      "label": "Device 1",
      "transactions": 12
    },
    {
      "id": "ip_1",
      "type": "ip",
      "label": "192.168.1.100",
      "transactions": 56
    }
  ],
  "links": [
    { "source": "user_1", "target": "device_1" },
    { "source": "device_1", "target": "ip_1" }
  ]
}
```

---

### GET /api/analytics/heatmap

Fetch heatmap data for visualizations.

**Query Parameters:**
```
?type=hourly           # hourly | daily | country
?period=7              # Period (days or weeks)
?country=US            # Filter by country (optional)
```

**Response (Hourly Heatmap):**
```json
{
  "type": "hourly",
  "data": [
    {
      "hour": 0,
      "dayOfWeek": 0,
      "fraudCount": 5,
      "totalCount": 120,
      "avgScore": 0.35
    },
    {
      "hour": 1,
      "dayOfWeek": 0,
      "fraudCount": 3,
      "totalCount": 98,
      "avgScore": 0.28
    }
  ]
}
```

**Response (Country Heatmap):**
```json
{
  "type": "country",
  "data": [
    { "country": "US", "avgScore": 0.45, "count": 1250 },
    { "country": "GB", "avgScore": 0.52, "count": 890 },
    { "country": "DE", "avgScore": 0.38, "count": 650 }
  ]
}
```

---

### GET /api/analytics/summary

Get aggregated analytics summary.

**Response:**
```json
{
  "totalTransactions": 5420,
  "fraudulentTransactions": 1245,
  "fraudPercentage": 22.96,
  "averageFraudScore": 0.48,
  "avgScoreByCountry": {
    "US": 0.45,
    "GB": 0.52,
    "DE": 0.38
  },
  "topRiskyMerchants": [
    { "merchant_id": "merchant_crypto_1", "avgScore": 0.78 },
    { "merchant_id": "merchant_gambling_5", "avgScore": 0.72 }
  ],
  "topRiskyCountries": [
    { "country": "RU", "avgScore": 0.68 },
    { "country": "NG", "avgScore": 0.65 }
  ]
}
```

---

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-23T10:30:00Z",
  "uptime": 3600,
  "connections": {
    "neo4j": "connected",
    "redis": "connected",
    "fraudApi": "connected"
  }
}
```

---

## 🔄 Request Flow - /api/analyze

```
1. Client sends POST /api/analyze
   ↓
2. Backend validates input (basic JSON checks)
   ↓
3. Check circuit breaker status
   ├─ If open → return 503 error
   └─ If closed → continue
   ↓
4. Try to acquire analyze slot
   ├─ If concurrent limit reached → queue request (wait with timeout)
   ├─ If queue timeout → return 503 error
   └─ If slot acquired → continue
   ↓
5. Increment analyzeInFlight counter
   ↓
6. Proxy request to Fraud API (with timeout)
   ├─ Success → get fraud_score, decision, reasons
   ├─ Timeout → set circuit breaker, return 503
   └─ Error → try circuit breaker
   ↓
7. Persist result to Neo4j
   ├─ Merge Transaction node
   ├─ Update fraud_score, decision, reasons
   └─ If error → log warning (non-critical)
   ↓
8. Invalidate Redis cache (heatmap data)
   ├─ If error → log warning (non-critical)
   └─ Continue
   ↓
9. Return result to client (200 OK)
   ↓
10. Decrement analyzeInFlight counter
```

---

## 🌐 WebSocket Events (/stream)

### Connection

```javascript
// Client connects to /stream namespace
socket.on('connect', () => {
  console.log('Connected to stream:', socket.id);
});
```

### Events from Server

**transaction** - New fraud analysis result

```javascript
socket.on('transaction', (data) => {
  // {
  //   transaction_id: "txn_abc123",
  //   fraud_score: 0.75,
  //   decision: "REVIEW",
  //   reasons: [...],
  //   timestamp: "2026-03-23T10:30:00Z"
  // }
});
```

**stats_update** - Aggregated statistics update

```javascript
socket.on('stats_update', (data) => {
  // {
  //   fraudCount: 1245,
  //   totalCount: 5420,
  //   averageScore: 0.48
  // }
});
```

### Events from Client

**play** - Start streaming

```javascript
socket.emit('play');
```

**pause** - Stop streaming

```javascript
socket.emit('pause');
```

**speed** - Set stream speed

```javascript
socket.emit('speed', { value: 2 });  // 2x speed
```

---

## 🔌 Concurrency Control

### Request Queuing

Backend uses simple in-memory queue to limit concurrent Fraud API requests.

```javascript
// Configuration
const ANALYZE_MAX_CONCURRENT = 4;  // Max 4 concurrent requests
const ANALYZE_QUEUE_TIMEOUT_MS = 20000;  // Wait up to 20s

// Queue implementation
async function acquireAnalyzeSlot(timeoutMs) {
  const start = Date.now();
  
  // Wait for available slot
  while (analyzeInFlight >= ANALYZE_MAX_CONCURRENT) {
    if (Date.now() - start > timeoutMs) {
      return false;  // Timeout - queue full
    }
    await new Promise(resolve => setTimeout(resolve, 25));  // Polling
  }
  
  analyzeInFlight += 1;
  return true;  // Slot acquired
}
```

### Circuit Breaker

Protects against cascading failures when Fraud API is down.

```javascript
// Configuration
const FRAUD_API_CIRCUIT_OPEN_MS = 15000;  // Stay open for 15s

// Circuit breaker logic
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

---

## 💾 Database Persistence

### Neo4j Integration

**Driver Setup:**
```javascript
import neo4j from 'neo4j-driver';

const neo4jDriver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

// Get session
const session = neo4jDriver.session({ database: 'neo4j' });
```

**Transaction Persistence:**
```cypher
MERGE (t:Transaction {transaction_id: $transaction_id})
SET t.timestamp = datetime($timestamp),
    t.transaction_hour = $transaction_hour,
    t.fraud_score = $fraud_score,
    t.decision = $decision,
    t.reasons = $reasons
RETURN t
```

**What Gets Persisted:**
- Transaction node creation/update
- Fraud score, decision, reasons
- Timestamp and hour of day
- Relationships (already created by Fraud API)

### Redis Integration

**Client Setup:**
```javascript
import { createClient } from 'redis';

const redisClient = createClient({ url: REDIS_URL });
await redisClient.connect();
```

**Cache Invalidation:**
```javascript
// On every analysis result, invalidate heatmap cache
const keys = await redisClient.keys('heatmap:*');
if (keys.length > 0) {
  await redisClient.del(keys);
}
```

---

## 🚀 Server Startup Sequence

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';

// 1. Create Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// 2. Setup middleware
app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// 3. Connect to Neo4j
const neo4jDriver = neo4j.driver(...);

// 4. Connect to Redis
const redisClient = createClient(...);
await redisClient.connect();

// 5. Setup API routes
app.post('/api/analyze', ...);
app.get('/api/graph/network', ...);
app.get('/api/analytics/heatmap', ...);

// 6. Setup WebSocket namespace
setupStreamNamespace(io);

// 7. Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## 🔍 Real-time Stream Implementation

### Stream Configuration

```javascript
const streamNsp = io.of('/stream');

streamNsp.on('connection', (socket) => {
  let interval = null;
  let speed = 1000;        // ms between emissions
  let inFlight = false;    // Prevent overlapping
  let paused = true;       // Start paused
  
  // ... event handlers
});
```

### Stream Generation Logic

```javascript
const emitTransaction = async () => {
  if (inFlight) return;  // Prevent overlap
  inFlight = true;
  
  try {
    // 1. Generate random transaction
    const { request } = generateTransaction();
    
    // 2. Analyze with Fraud API
    const response = await axios.post(ANALYZE_URL, request);
    
    // 3. Persist to Neo4j
    // (handled by analyze endpoint)
    
    // 4. Broadcast to all clients
    streamNsp.emit('transaction', {
      ...request,
      ...response.data,
    });
    
    // 5. Update stats
    streamNsp.emit('stats_update', calculateStats());
    
  } catch (error) {
    console.error('Stream error:', error);
  } finally {
    inFlight = false;
  }
};
```

### Stream Control

```javascript
// Client emits 'play'
socket.on('play', () => {
  paused = false;
  interval = setInterval(emitTransaction, speed);
});

// Client emits 'pause'
socket.on('pause', () => {
  paused = true;
  clearInterval(interval);
});

// Client emits 'speed'
socket.on('speed', (data) => {
  speed = data.value * 1000;  // Convert to ms
  if (!paused) {
    clearInterval(interval);
    interval = setInterval(emitTransaction, speed);
  }
});
```

---

## 🧪 Testing Endpoints

### Using curl

```bash
# Test /api/analyze
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_test_123",
    "user_id": "user_test",
    "amount": 250,
    "currency": "USD",
    "country": "US",
    "device_id": "dev_test",
    "ip_address": "192.168.1.1",
    "merchant_id": "merchant_1",
    "merchant_category": "electronics",
    "payment_method": "credit_card",
    "is_international": false,
    "customer_age": 35,
    "account_age_days": 730,
    "transaction_hour": 10,
    "timestamp": "2026-03-23T10:30:00Z"
  }'

# Test /api/health
curl http://localhost:3001/api/health

# Test /api/graph/network
curl "http://localhost:3001/api/graph/network?depth=2&limit=50"

# Test /api/analytics/heatmap
curl "http://localhost:3001/api/analytics/heatmap?type=hourly&period=7"
```

### Using Postman

1. Create new POST request
2. URL: `http://localhost:3001/api/analyze`
3. Headers tab → Add `Content-Type: application/json`
4. Body tab → Select `raw` and `JSON`
5. Paste sample transaction JSON
6. Click Send

---

## 🐛 Debugging

### Enable Debug Logging

```bash
DEBUG=* npm run dev
```

### Check Server Health

```bash
# In another terminal
curl http://localhost:3001/api/health
```

### Monitor Stream in Real-time

```javascript
// Browser console
const ws = new WebSocket('ws://localhost:3001/stream');
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
});
```

### Check Database Connections

```bash
# Neo4j
curl http://localhost:3001/api/health | jq .connections.neo4j

# Redis
redis-cli ping
```

---

## 📈 Performance Tips

### Optimize Fraud API Calls
- Increase `ANALYZE_MAX_CONCURRENT` for higher throughput
- Reduce `ANALYZE_QUEUE_TIMEOUT_MS` to fail faster
- Monitor Fraud API latency

### Database Optimization
- Create Neo4j indexes on frequently queried properties
- Monitor Redis memory usage
- Clear old heatmap cache entries

### Stream Performance
- Adjust stream speed with clients
- Reduce frequency of stats_update emissions
- Batch database writes if possible

---

## 🔗 Dependencies

```javascript
// Server framework
"express": "^4.18.3"
"cors": "^2.8.5"
"socket.io": "^4.7.4"

// Databases
"neo4j-driver": "^5.17.0"
"redis": "^4.6.12"

// HTTP client
"axios": "^1.6.7"

// Utilities
"dotenv": "^16.4.4"
"morgan": "^1.10.0"
"@faker-js/faker": "^8.4.1"
```

---

## 🚀 Starting Backend Development

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Output should show:
# Server running on http://localhost:3001
# Connected to Neo4j at bolt://localhost:7687
# Connected to Redis at redis://localhost:6379
```

---

**Last Updated:** March 2026
