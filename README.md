# 🛡️ Fraud Detection Engine — Frontend Dashboard

A **Vue 3 + Vite** frontend application with real-time transaction streaming, D3.js force-directed graph visualizations, ECharts heatmaps, and interactive testing scenarios. The companion **Express + Socket.IO** backend proxies to the fraud detection API and exposes Neo4j graph data and aggregated analytics.

![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7-F9A03C?logo=d3dotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Live Dashboard** | Real-time transaction feed with WebSocket streaming, animated counters, and fraud score sparkline charts |
| **Transaction Form** | Submit individual transactions for fraud analysis with field validation and auto-generate random payloads |
| **Scenario Gallery** | 12 pre-built test scenarios (high amount, high-risk country, velocity burst, shared device, etc.) with one-click or batch submission |
| **D3.js Network Graph** | Force-directed graph showing User → Device → IP relationships; zoom, drag, node highlighting, SVG export |
| **Geographic Heatmap** | ECharts world map showing average fraud score by country with continuous color scale |
| **Temporal Heatmap** | Hour-of-day × day-of-week heatmap revealing fraud pattern timing |
| **Transaction History** | Sortable/filterable table with pagination, detail modal, CSV export, persisted to localStorage (max 10,000 records) |
| **Multi-tab History** | Table / Graph / Heatmap tabs all sharing the same filter context |
| **Stream Controls** | Play/pause, speed slider (0.5×–10×), record & replay sessions |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│  Browser (Vue 3 SPA)                                  │
│  ├─ Pinia stores (history, stream, analytics)         │
│  ├─ Vue Router (dashboard, analyze, scenarios, etc.)  │
│  ├─ D3.js (network graph)                             │
│  └─ ECharts (heatmaps, sparklines)                    │
└──────────────┬───────────────────────┬───────────────┘
               │  HTTP /api/*          │  WS /stream
               ▼                       ▼
┌──────────────────────────────────────────────────────┐
│  Backend (Express + Socket.IO)       :3001            │
│  ├─ POST /api/analyze  →  proxy to Fraud API          │
│  ├─ GET  /api/graph/network  →  Neo4j query           │
│  ├─ GET  /api/analytics/heatmap  →  Neo4j + Redis     │
│  └─ WS   /stream  →  random transaction generator     │
└──────────────┬───────────────────────────────────────┘
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
   Fraud     Neo4j    Redis
   API       :7687    :6379
   :8000
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker** & **Docker Compose** (for containerized mode)
- Fraud Detection API running locally or via Docker

### Local Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend && npm install && cd ..

# 3. Copy environment file
cp .env.example .env
# Edit .env as needed (set FRAUD_API_URL, Neo4j creds, etc.)

# 4. Start the backend (in one terminal)
cd backend && npm run dev

# 5. Start the frontend dev server (in another terminal)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🐳 Deployment Modes (Docker Compose)

### 1. Standalone (Default)

Runs the **complete stack** — frontend, backend, fraud API (from Docker Hub), Neo4j, and Redis.

```bash
# Pull and run everything
docker-compose --profile standalone up --build

# Or simply (fraud-api requires the standalone profile):
docker-compose --profile standalone up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:3001 |
| Fraud API | http://localhost:8000 |
| Neo4j Browser | http://localhost:7474 |

### 2. Dev Mode

Excludes the fraud API — it assumes you're running it **on your host machine** (e.g., during development).

```bash
# Set fraud API URL to host machine
FRAUD_API_URL=http://host.docker.internal:8000 docker-compose up --build
```

### 3. Full Mode

Adds **Neo4j Browser** and **Redis Commander** for debugging.

```bash
docker-compose --profile full --profile standalone up --build
```

| Extra Service | URL |
|---------------|-----|
| Neo4j Browser (debug) | http://localhost:7475 |
| Redis Commander | http://localhost:8081 |

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRAUD_API_IMAGE` | `yourorg/fraud-detection-engine:latest` | Docker Hub image for fraud API |
| `FRAUD_API_URL` | `http://fraud-api:8000` | Backend proxy target for fraud API |
| `NEO4J_URI` | `bolt://neo4j:7687` | Neo4j connection URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `FRONTEND_PORT` | `80` | Host port for the frontend |
| `BACKEND_PORT` | `3001` | Host port for the backend |
| `VITE_API_URL` | `/api` | Frontend API base URL (build-time) |
| `VITE_WS_URL` | `http://localhost:3001` | WebSocket server URL (build-time) |

---

## 📁 Project Structure

```
fraud-detection-frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/           # TransactionFeed, LiveStats, ScoreTrend
│   │   ├── graph/               # NetworkGraph (D3.js)
│   │   ├── history/             # HistoryTable, HistoryGraph, HistoryHeatmap
│   │   ├── viz/                 # ScoreGauge, DecisionBadge, ReasonTags, ServiceBreakdown
│   │   └── TransactionForm.vue
│   ├── composables/             # useWebSocket
│   ├── router/                  # Vue Router config
│   ├── services/                # api.ts, scenarios.ts
│   ├── stores/                  # Pinia stores (history, stream, analytics)
│   ├── styles/                  # Tailwind + custom CSS
│   ├── types/                   # TypeScript interfaces
│   ├── views/                   # Page-level components
│   ├── App.vue
│   └── main.ts
├── backend/
│   ├── server.js                # Express + Socket.IO + Neo4j + Redis
│   ├── services/
│   │   └── stream.js            # WebSocket stream generator
│   └── package.json
├── docker-compose.yml           # Multi-profile orchestration
├── Dockerfile.frontend          # Multi-stage nginx build
├── Dockerfile.backend           # Node.js production image
├── nginx.conf                   # Reverse proxy + SPA config
├── .env.example                 # Environment template
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 📸 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Live Dashboard | Real-time feed, stats, sparkline |
| `/analyze` | Analyze | Manual transaction submission form |
| `/scenarios` | Scenarios | Pre-built test scenario gallery |
| `/history` | History | Table / Graph / Heatmap tabs |
| `/network` | Network | D3 force-directed graph |
| `/heatmaps` | Heatmaps | Geographic + temporal heatmaps |

---

## 🛠️ Development

```bash
# Frontend dev server with HMR
npm run dev

# Type check + build
npm run build

# Preview production build
npm run preview

# Backend with auto-reload
cd backend && npm run dev
```

---

## 📜 License

MIT
