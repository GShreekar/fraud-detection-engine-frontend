# Setup Guide - Local Development Environment

This guide walks you through setting up the Fraud Detection Engine Frontend for local development.

## 📋 Prerequisites

### System Requirements
- **OS:** Linux, macOS, or Windows (with WSL2 recommended)
- **Node.js:** v20 or higher
- **npm:** v10 or higher (comes with Node.js)

### Software Dependencies
- **Git:** For version control
- **Docker & Docker Compose:** For running databases and services (optional for local dev, required for full stack)
- **curl or Postman:** For testing API endpoints
- **VS Code or IDE:** For development

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20+

# Check npm version
npm --version   # Should be v10+

# Check Git
git --version

# Check Docker (if using Docker)
docker --version
docker-compose --version
```

---

## 🔧 Installation Steps

### 1. Clone and Navigate to Project

```bash
git clone <repository-url> fraudDetectionEngineFrontend
cd fraudDetectionEngineFrontend
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This installs all frontend dependencies from `package.json`:
- Vue 3 and Vue Router
- Pinia state management
- D3.js and ECharts
- TypeScript and build tools
- Tailwind CSS

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

This installs backend dependencies:
- Express.js and Socket.IO
- Neo4j driver
- Redis client
- Faker for data generation

---

## ⚙️ Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

If no `.env.example` exists, create `.env` manually:

```bash
touch .env
```

### 2. Configure Environment Variables

Edit `.env` with your settings:

```ini
# Frontend
VITE_API_BASE_URL=http://localhost:3001

# Backend
PORT=3001
FRAUD_API_URL=http://localhost:8000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379

# Performance Tuning
ANALYZE_MAX_CONCURRENT=4
ANALYZE_QUEUE_TIMEOUT_MS=20000
FRAUD_API_TIMEOUT_MS=8000
FRAUD_API_CIRCUIT_OPEN_MS=15000

# CORS
CORS_ORIGIN=*

# Logging
DEBUG=true
```

### 3. Configure Backend .env (Optional)

Some teams keep a separate `backend/.env`:

```bash
cd backend
cat > .env << 'EOF'
PORT=3001
FRAUD_API_URL=http://localhost:8000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379
EOF
cd ..
```

---

## 🐳 Database Setup

### Option A: Using Docker Compose (Recommended)

Docker Compose handles all database setup:

```bash
# Start Neo4j, Redis, and Fraud API in background
docker-compose up -d neo4j redis fraud-api

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

**Verify Database Connectivity:**

```bash
# Neo4j Browser (visit in browser)
# http://localhost:7474

# Redis CLI
redis-cli
> PING
> exit

# Fraud API health
curl http://localhost:8000/health
```

### Option B: Manual Installation

If you prefer not to use Docker:

#### Neo4j Setup

```bash
# Download and run Neo4j
# Visit https://neo4j.com/download/community-edition/ for community edition

# Or using Docker just for Neo4j
docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5-community

# Access Neo4j Browser
# http://localhost:7474
```

#### Redis Setup

```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server

# Or using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Verify Redis
redis-cli PING
```

---

## 🚀 Development Servers

### Terminal 1: Start Backend

```bash
cd backend
npm run dev

# Output should show:
# Server running on http://localhost:3001
# Connected to Neo4j at bolt://localhost:7687
# Connected to Redis at redis://localhost:6379
```

**Backend Features:**
- Auto-restarts on file changes (`--watch`)
- Serves API endpoints at `http://localhost:3001`
- WebSocket streaming at `ws://localhost:3001/stream`

### Terminal 2: Start Frontend

```bash
npm run dev

# Output should show:
# VITE v5.x.x
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

**Frontend Features:**
- Hot Module Replacement (HMR) for instant updates
- Access at `http://localhost:5173`
- TypeScript type checking
- Tailwind CSS compilation

### Terminal 3 (Optional): Fraud API

```bash
# If not running in Docker, and you have it locally
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 🌐 Access the Application

Once both servers are running:

### Frontend
- **URL:** `http://localhost:5173`
- **Features:** Dashboard, scenarios, graphs, heatmaps, history

### Backend API
- **Base URL:** `http://localhost:3001`
- **Endpoints:** `/api/analyze`, `/api/graph/*`, `/api/analytics/*`

### Neo4j Browser
- **URL:** `http://localhost:7474`
- **Username:** `neo4j`
- **Password:** From your `.env` file

### Redis CLI

```bash
redis-cli
> SELECT 0
> KEYS *
> GET key_name
> FLUSHDB  # Clear database
> exit
```

---

## 🧪 Verify Everything Works

### 1. Frontend Loads
```bash
# In browser, visit:
# http://localhost:5173
# You should see the fraud detection dashboard
```

### 2. Test API Connection
```bash
curl http://localhost:3001/api/health
# Should return: { "status": "ok" }
```

### 3. Test WebSocket
Open browser DevTools and check Network/WS tab:
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:3001/stream');
ws.addEventListener('open', () => console.log('Connected'));
ws.addEventListener('message', (e) => console.log('Message:', e.data));
```

### 4. Test Database Connections

**Neo4j:**
```bash
curl -X GET http://localhost:3001/api/health/neo4j
# Should show connection status
```

**Redis:**
```bash
redis-cli
> INFO server
> exit
```

---

## 📦 Build for Production

### Frontend Build

```bash
npm run build

# Output:
# dist/
# ├── index.html
# ├── assets/
# │   ├── main.js
# │   ├── main.css
# │   └── ...
```

### Backend Build (No build needed)

Backend runs directly with Node.js.

### Docker Build

```bash
# Build all services
docker-compose build

# Or build individually
docker build -f Dockerfile.frontend -t fraud-frontend:latest .
docker build -f Dockerfile.backend -t fraud-backend:latest .
```

---

## ⚡ Performance Tips

### Frontend Optimization
- Clear browser cache: `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (macOS)
- Disable extensions that might interfere
- Use Chrome DevTools for profiling

### Backend Optimization
- Increase `ANALYZE_MAX_CONCURRENT` for throughput
- Adjust `ANALYZE_QUEUE_TIMEOUT_MS` based on API latency
- Monitor memory with `node --inspect` for profiling

### Database Optimization
- Neo4j: Create indexes for frequently queried properties
- Redis: Monitor memory usage with `INFO memory`

---

## 🆘 Common Setup Issues

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# For backend too
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Database Connection Failed

```bash
# Check if Docker containers are running
docker ps

# Check logs
docker logs neo4j
docker logs redis

# Restart containers
docker-compose restart
```

### WebSocket Connection Fails

```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check Socket.IO is initialized
# Browser DevTools > Network > WS should show connection attempts
```

### CORS Errors

```bash
# Update .env
CORS_ORIGIN=http://localhost:5173

# Restart backend
# Backend must be restarted for env changes
```

---

## 📚 Next Steps

Once setup is complete:

1. **Explore the Frontend** - Check [FRONTEND.md](./FRONTEND.md) for component overview
2. **Understand the Architecture** - Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Learn the API** - Review [API_REFERENCE.md](./API_REFERENCE.md)
4. **Query Databases** - See [DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md)

---

## 🆘 Getting Help

- **Node version errors?** Ensure you have Node v20+
- **Port conflicts?** Kill conflicting processes
- **Database won't connect?** Check Docker containers are running
- **Still stuck?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Last Updated:** March 2026
