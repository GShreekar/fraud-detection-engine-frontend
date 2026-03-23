# System Architecture

High-level overview of the Fraud Detection Engine Frontend system design and component relationships.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client Layer)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Vue 3 SPA (Port 5173)                                       │   │
│  │  ├─ Components                                               │   │
│  │  │  ├─ Live Dashboard (transaction feed, stats)             │   │
│  │  │  ├─ Network Graph (D3.js force-directed)                │   │
│  │  │  ├─ Heatmaps (ECharts)                                  │   │
│  │  │  ├─ Transaction History (table, pagination)             │   │
│  │  │  ├─ Transaction Form (fraud analysis testing)           │   │
│  │  │  └─ Scenario Gallery (pre-built test scenarios)         │   │
│  │  │                                                          │   │
│  │  ├─ Stores (Pinia)                                          │   │
│  │  │  ├─ streamStore (real-time transactions)               │   │
│  │  │  ├─ historyStore (transaction history)                 │   │
│  │  │  └─ analyticsStore (aggregated metrics)                │   │
│  │  │                                                          │   │
│  │  ├─ Router (Vue Router)                                    │   │
│  │  │  ├─ /dashboard (home)                                   │   │
│  │  │  ├─ /analyze (transaction form)                         │   │
│  │  │  ├─ /scenarios (test gallery)                           │   │
│  │  │  ├─ /network (graph visualization)                      │   │
│  │  │  ├─ /history (transaction history)                      │   │
│  │  │  └─ /heatmap (geographic & temporal)                    │   │
│  │  │                                                          │   │
│  │  └─ Composables                                             │   │
│  │     └─ useWebSocket (real-time streaming)                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────┬──────────────────────────────┬──────────────────────┘
                │ HTTP /api/*                  │ WebSocket /stream
                ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Application Layer)                       │
│  Express.js + Socket.IO (Port 3001)                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Express Server                                             │   │
│  │  ├─ API Endpoints                                           │   │
│  │  │  ├─ POST /api/analyze (transaction analysis)            │   │
│  │  │  ├─ GET  /api/graph/network (node relationships)        │   │
│  │  │  ├─ GET  /api/analytics/heatmap (time/geo patterns)    │   │
│  │  │  ├─ GET  /api/analytics/summary (overall stats)         │   │
│  │  │  └─ GET  /api/health (server status)                    │   │
│  │  │                                                          │   │
│  │  ├─ Middleware                                              │   │
│  │  │  ├─ CORS handler                                        │   │
│  │  │  ├─ Morgan logging                                      │   │
│  │  │  ├─ Request queuing (concurrency control)               │   │
│  │  │  └─ Circuit breaker (fault tolerance)                   │   │
│  │  │                                                          │   │
│  │  └─ Socket.IO Namespace (/stream)                          │   │
│  │     ├─ Emit: transaction (fraud analysis result)           │   │
│  │     ├─ Emit: stats_update (aggregate metrics)              │   │
│  │     ├─ On: play/pause (stream control)                     │   │
│  │     └─ On: speed (playback rate)                           │   │
│  │                                                          │   │
│  │  Request Flow:                                             │   │
│  │  1. Client → Backend (/api/analyze)                        │   │
│  │  2. Queue request if concurrent limit reached              │   │
│  │  3. Proxy to Fraud API (Python)                            │   │
│  │  4. Persist result to Neo4j                                │   │
│  │  5. Invalidate Redis cache                                 │   │
│  │  6. Return result to client                                │   │
│  │                                                          │   │
│  │  WebSocket Flow:                                           │   │
│  │  1. Generate random transaction                            │   │
│  │  2. Send to Fraud API for analysis                         │   │
│  │  3. Persist to Neo4j                                       │   │
│  │  4. Broadcast to all connected clients                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────┬─────────┬──────────────────┬────────────────────┘
                    │         │                  │
                    ▼         ▼                  ▼
         ┌──────────────┐  ┌────────┐  ┌──────────────────┐
         │  Fraud API   │  │ Neo4j  │  │ Redis            │
         │  (Python)    │  │ Graph  │  │ Cache            │
         │  :8000       │  │ :7687  │  │ :6379            │
         │              │  │        │  │                  │
         │ • Analyze    │  │ • Tx   │  │ • Heatmap data   │
         │   transaction│  │   nodes│  │ • Session data   │
         │ • Compute    │  │ • User │  │ • Recent stats   │
         │   fraud score│  │   nodes│  │                  │
         │ • Return     │  │ • Device│ │                  │
         │   decision   │  │   nodes│  │                  │
         │              │  │ • IP   │  │                  │
         │              │  │   nodes│  │                  │
         │              │  │ • Rels │  │                  │
         │              │  │        │  │                  │
         └──────────────┘  └────────┘  └──────────────────┘
```

---

## 🔄 Data Flow Diagram

### Transaction Analysis Flow

```
┌─────────────┐
│   Client    │ (User submits transaction in form)
└──────┬──────┘
       │ POST /api/analyze
       ▼
┌─────────────────────────────┐
│   Backend Express Server    │
│  - Validate input           │
│  - Queue if needed          │
│  - Check circuit breaker    │
└──────┬──────────────────────┘
       │ HTTP POST
       ▼
┌──────────────────────────────┐
│   Fraud Detection API        │
│  (Python, Port 8000)         │
│  - Load rules engine         │
│  - Compute features          │
│  - ML model inference        │
│  - Return fraud_score        │
└──────┬───────────────────────┘
       │ Return analysis result
       ▼
┌──────────────────────────────┐
│   Backend (persist)          │
│  - Merge Transaction node    │
│  - Set fraud_score           │
│  - Link to User/Device/IP    │
└──────┬──────────┬────────────┘
       │          │
   Neo4j      Redis
       │          │
       ▼          ▼
┌──────────┐  ┌────────────────┐
│ Store Tx │  │ Invalidate     │
│ & Scores │  │ heatmap cache  │
└──────────┘  └────────────────┘
       │
       ▼
┌──────────────────────────────┐
│   Backend returns result     │
│   + fraud_score              │
│   + decision                 │
│   + reasons                  │
└──────┬───────────────────────┘
       │ HTTP response
       ▼
┌──────────────────────────────┐
│   Client receives result     │
│  - Show score gauge          │
│  - Display decision badge    │
│  - List risk reasons         │
│  - Add to history            │
└──────────────────────────────┘
```

### Real-time Stream Flow

```
┌──────────────────────────────┐
│   WebSocket Connection       │ (Client connects to /stream)
│   (Browser)                  │
└──────┬───────────────────────┘
       │ WS: connect
       ▼
┌──────────────────────────────┐
│   Backend Stream Namespace   │
│  - Register new client       │
│  - Start streaming loop      │
└──────┬───────────────────────┘
       │ Every N ms (speed controlled)
       ▼
┌──────────────────────────────┐
│   Generate Transaction       │
│  - Random user_id            │
│  - Random amount             │
│  - Random device/IP          │
│  - Random country            │
└──────┬───────────────────────┘
       │ POST /api/analyze (internal)
       ▼
┌──────────────────────────────┐
│   Fraud API Analysis         │
│  - Compute fraud score       │
│  - Return decision           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│   Backend (persist + cache)  │
│  - Save to Neo4j             │
│  - Invalidate Redis          │
└──────┬──────────┬────────────┘
       │          │
       │          └─→ Redis
       │
       ▼
┌──────────────────────────────┐
│   Broadcast to All Clients   │
│  WS: emit('transaction')     │
│       emit('stats_update')   │
└──────┬───────────────────────┘
       │ WebSocket message
       ▼
┌──────────────────────────────┐
│   Client receives update     │
│  - Update live feed          │
│  - Refresh charts            │
│  - Update counters           │
└──────────────────────────────┘
```

---

## 🗂️ Component Hierarchy

### Frontend Vue Components

```
App.vue (root)
├── Layout (implicit)
│
├── LiveDashboard.vue
│   ├── LiveStats.vue (counters, KPIs)
│   ├── TransactionFeed.vue (stream list)
│   └── ScoreTrend.vue (sparkline chart)
│
├── AnalyzeView.vue
│   ├── TransactionForm.vue
│   └── RequestResponseModal.vue
│
├── ScenarioGallery.vue
│   └── (Scenario cards with submit buttons)
│
├── NetworkView.vue
│   └── NetworkGraph.vue (D3.js)
│
├── HeatmapView.vue
│   ├── HistoryHeatmap.vue (ECharts)
│   └── HistoryGraph.vue (ECharts)
│
└── HistoryView.vue
    ├── HistoryTable.vue (transactions)
    ├── HistoryGraph.vue (time series)
    └── HistoryHeatmap.vue (geo heatmap)
```

### State Management (Pinia Stores)

```
streamStore
├── isPlaying: boolean
├── speed: number
├── transactions: Transaction[]
├── stats: { fraud_count, total_count, avg_score }
└── Actions
   ├── addTransaction()
   ├── updateStats()
   ├── pause()
   └── setSpeed()

historyStore
├── transactions: Transaction[]
├── filters: { dateRange, country, score }
├── sortBy: string
└── Actions
   ├── addTransaction()
   ├── setFilter()
   ├── exportCSV()
   └── loadFromStorage()

analyticsStore
├── heatmapData: HeatmapData
├── summary: SummaryStats
└── Actions
   ├── fetchHeatmap()
   ├── fetchSummary()
   └── refreshCache()
```

---

## 🔌 Integration Points

### Backend ↔ Fraud API

**Request:**
```json
{
  "transaction_id": "txn_abc123",
  "user_id": "user_xyz",
  "amount": 250.00,
  "currency": "USD",
  "country": "US",
  "device_id": "dev_123",
  "ip_address": "192.168.1.1",
  "merchant_id": "merchant_1",
  "merchant_category": "electronics",
  "is_international": false,
  "timestamp": "2026-03-23T10:30:00Z"
}
```

**Response:**
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
  "confidence": 0.92
}
```

### Backend ↔ Neo4j

**Query:**
```cypher
MATCH (t:Transaction {transaction_id: $tx_id})
SET t.fraud_score = $score,
    t.decision = $decision,
    t.reasons = $reasons
RETURN t
```

**Data Model:**
```
Nodes:
- User {id, name, email}
- Device {id, type, os}
- IP {address, location}
- Merchant {id, category}
- Transaction {id, amount, fraud_score, decision, timestamp}

Relationships:
- User -[USES]-> Device
- User -[FROM_IP]-> IP
- Device -[FROM_IP]-> IP
- User -[TRANSACTS_WITH]-> Merchant
- Transaction -[BELONGS_TO]-> User
- Transaction -[USES_DEVICE]-> Device
- Transaction -[FROM_IP]-> IP
- Transaction -[WITH_MERCHANT]-> Merchant
```

### Backend ↔ Redis

**Keys:**
```
heatmap:hourly:{timestamp}
  → Cached hourly fraud statistics

heatmap:country:{country}
  → Cached country-level metrics

session:{session_id}
  → Stream session metadata

recent_stats:{window}
  → Cached recent aggregated stats
```

---

## 🔐 Security Architecture

### Client Security
- **Input Validation:** Zod schemas for all form inputs
- **CORS:** Restricted origins (configurable)
- **HTTPS:** Recommended for production

### Backend Security
- **Authentication:** API key or JWT (extendable)
- **Rate Limiting:** Configurable via ANALYZE_QUEUE_TIMEOUT_MS
- **Circuit Breaker:** Fails gracefully under Fraud API unavailability
- **Error Masking:** Generic errors to clients, detailed logs server-side

### Database Security
- **Neo4j:** Requires authentication (NEO4J_USER/PASSWORD)
- **Redis:** Can be configured with password (optional)
- **Network:** All services isolated in Docker network

---

## ⚙️ Configuration & Environment

### Backend Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3001 | Backend server port |
| `FRAUD_API_URL` | http://localhost:8000 | Fraud API endpoint |
| `NEO4J_URI` | bolt://localhost:7687 | Neo4j connection string |
| `NEO4J_USER` | neo4j | Neo4j username |
| `NEO4J_PASSWORD` | password | Neo4j password |
| `REDIS_URL` | redis://localhost:6379 | Redis connection string |
| `ANALYZE_MAX_CONCURRENT` | 4 | Max concurrent API requests |
| `ANALYZE_QUEUE_TIMEOUT_MS` | 20000 | Queue timeout in ms |
| `FRAUD_API_TIMEOUT_MS` | 8000 | API request timeout |
| `FRAUD_API_CIRCUIT_OPEN_MS` | 15000 | Circuit breaker open duration |
| `CORS_ORIGIN` | * | CORS allowed origins |

---

## 📊 Performance Considerations

### Frontend
- **Bundle Size:** ~500KB gzipped (Vue, D3, ECharts, etc.)
- **Runtime:** Real-time updates via WebSocket
- **Memory:** Max 10,000 transactions in history store

### Backend
- **Concurrency:** Configurable via ANALYZE_MAX_CONCURRENT
- **Queue:** Simple FIFO with timeout
- **Caching:** Redis for heatmap and stats

### Database
- **Neo4j:** Graph queries for relationships (optimized with indexes)
- **Redis:** In-memory cache for frequent queries

---

## 🔗 Technology Stack

### Frontend
- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite (dev server, bundler)
- **State Management:** Pinia
- **Routing:** Vue Router
- **Visualization:** D3.js (networks), ECharts (charts)
- **Styling:** Tailwind CSS
- **HTTP:** Axios
- **Real-time:** Socket.IO Client

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-time:** Socket.IO
- **Databases:** Neo4j (driver), Redis (client)
- **Utilities:** Faker.js, Morgan, Dotenv

### Infrastructure
- **Containerization:** Docker, Docker Compose
- **Databases:** Neo4j Community 5, Redis 7
- **External API:** Python Fraud Detection Engine

---

## 📈 Scaling Considerations

### Horizontal Scaling
- **Frontend:** Deploy multiple instances behind load balancer
- **Backend:** Use Redis Pub/Sub for WebSocket sync across instances
- **Databases:** Neo4j Enterprise supports clustering

### Vertical Scaling
- **Memory:** Increase for larger Neo4j queries
- **CPU:** Affects concurrent transaction analysis

### Caching Strategy
- **Redis:** Cache heatmap data, aggregate stats
- **Browser:** localStorage for history (10,000 record limit)

---

**Last Updated:** March 2026
