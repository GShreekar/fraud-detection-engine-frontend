# Troubleshooting Guide

Solutions for common issues and debugging techniques.

## 🔧 Setup & Installation Issues

### Node Version Error

**Problem:** `Node v18 is too old, need v20+`

**Solution:**

```bash
# Check current version
node --version

# Update Node.js
# Using nvm (macOS/Linux)
nvm install 20
nvm use 20

# Using Homebrew (macOS)
brew install node@20
brew link node@20

# Using Windows Installer
# Download from https://nodejs.org/

# Using apt (Linux)
sudo apt update
sudo apt install nodejs=20.x  # or latest version
```

---

### npm Install Fails

**Problem:** `ERR! code ERESOLVE unable to resolve dependency tree`

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, use legacy peer deps
npm install --legacy-peer-deps
```

---

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3001`

**Solution (macOS/Linux):**

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

**Solution (Windows):**

```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Or use different port in .env
PORT=3002
```

---

### Git Clone Issues

**Problem:** `fatal: protocol 'https' does not provide 'password' capability`

**Solution:**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your@email.com"

# Add key to GitHub account
# Settings → SSH and GPG keys → New SSH key

# Or use GitHub CLI
gh auth login
```

---

## 🐳 Docker Issues

### Docker Command Not Found

**Problem:** `docker: command not found`

**Solution:**

```bash
# Install Docker
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/ubuntu/
# Windows: https://docs.docker.com/desktop/install/windows-install/

# Verify installation
docker --version
docker run hello-world
```

---

### Container Won't Start

**Problem:** Container exits immediately after starting

**Solution:**

```bash
# Check logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend

# Remove and restart
docker-compose down
docker-compose up -d --build

# Check if service is healthy
docker-compose ps
```

---

### Out of Memory Error

**Problem:** `OOMKilled` or container exits with code 137

**Solution:**

```bash
# Check current memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory

# Or increase swap
# Linux: sudo fallocate -l 4G /swapfile

# In docker-compose.yml, limit service memory:
services:
  neo4j:
    deploy:
      resources:
        limits:
          memory: 4G
```

---

### Cannot Connect to Docker Daemon

**Problem:** `Cannot connect to the Docker daemon`

**Solution:**

```bash
# Start Docker service
# macOS: Open Docker Desktop app
# Linux:
sudo systemctl start docker

# Windows: Open Docker Desktop app

# Verify
docker ps
```

---

## 🌐 Network & Connection Issues

### CORS Error in Browser

**Problem:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**

```bash
# Update .env
CORS_ORIGIN=http://localhost:5173

# Or for production
CORS_ORIGIN=https://yourfrontend.com

# Restart backend
cd backend && npm run dev
```

**In docker-compose.yml:**

```yaml
backend:
  environment:
    CORS_ORIGIN: "http://localhost"
```

---

### WebSocket Connection Failed

**Problem:** `WebSocket is closed before the connection is established`

**Solution:**

```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check firewall
# Port 3001 must be open

# In browser DevTools, check:
# Network tab → WS filter
# Should show: ws://localhost:3001/stream

# Restart backend
cd backend && npm run dev
```

---

### API Returns 503 Service Unavailable

**Problem:** `Queue timeout - too many concurrent requests`

**Solution:**

```bash
# Increase max concurrent requests in .env
ANALYZE_MAX_CONCURRENT=8  # Instead of 4

# Or increase queue timeout
ANALYZE_QUEUE_TIMEOUT_MS=30000  # Instead of 20000

# Restart backend
cd backend && npm run dev

# Check Fraud API is running
curl http://localhost:8000/health
```

---

## 💾 Database Issues

### Neo4j Connection Failed

**Problem:** `Could not perform discovery on bolt://localhost:7687`

**Solution:**

```bash
# Check if Neo4j is running
docker-compose ps neo4j

# Restart Neo4j
docker-compose restart neo4j

# View logs
docker-compose logs neo4j

# Check connection manually
curl http://localhost:7474

# Verify in .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

---

### Redis Connection Failed

**Problem:** `connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**

```bash
# Check if Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Test connection
redis-cli PING
# Should output: PONG

# If using Docker
docker-compose exec redis redis-cli PING
```

---

### Database Query Timeout

**Problem:** `Query timeout after 30000ms`

**Solution:**

```bash
# Check Neo4j logs for slow queries
docker-compose logs neo4j | grep slow

# Create indexes for frequently queried fields
# In Neo4j Browser:
CREATE INDEX ON :Transaction(fraud_score);
CREATE INDEX ON :Transaction(timestamp);

# Optimize queries - check PLAN
PROFILE MATCH (t:Transaction) WHERE t.fraud_score > 0.7 RETURN t;
```

---

### Full Disk / Storage Issues

**Problem:** `no space left on device` or database stops responding

**Solution:**

```bash
# Check disk usage
df -h

# View Docker volume sizes
docker system df

# Clean up unused containers/images
docker system prune

# Remove old data
# Neo4j:
docker-compose down -v
docker-compose up -d neo4j

# Redis:
docker-compose exec redis FLUSHDB
```

---

## 🎨 Frontend Issues

### Blank Page on http://localhost:5173

**Problem:** Page loads but shows nothing

**Solution:**

```bash
# Check dev server is running
npm run dev

# Check for errors in browser console
# DevTools → Console tab

# Clear cache and hard refresh
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (macOS)

# Check vite config
cat vite.config.ts

# Rebuild
npm run build
npm run preview
```

---

### TypeScript Errors

**Problem:** `Type 'X' is not assignable to type 'Y'`

**Solution:**

```bash
# Check TypeScript version
npx tsc --version

# Update types
npm install --save-dev @types/node

# Rebuild
npm run build

# Check tsconfig.json
cat tsconfig.json
```

---

### Hot Module Replacement (HMR) Not Working

**Problem:** Changes to Vue files don't auto-refresh

**Solution:**

```bash
# Restart dev server
# Ctrl+C to stop
npm run dev

# Check firewall allows localhost:5173

# Clear browser cache
# DevTools → Application → Clear Storage

# In vite.config.ts, verify HMR settings
export default {
  server: {
    hmr: {
      host: 'localhost',
      port: 5173,
    }
  }
}
```

---

### Chart/Visualization Not Rendering

**Problem:** D3 graph or ECharts heatmap appears empty

**Solution:**

```bash
# Check browser console for errors
# DevTools → Console

# Verify data is loading
// In browser console
import { useStreamStore } from '@/stores/streamStore'
const store = useStreamStore()
console.log(store.transactions)

# Check chart component receives data
// In DevTools, inspect Vue component
# Vue DevTools → Components tab

# Ensure window size is sufficient
// Charts need min width/height
width >= 400px
height >= 300px
```

---

## 📊 Performance Issues

### Slow Transaction Analysis

**Problem:** POST /api/analyze takes >5 seconds

**Solution:**

```bash
# Check Fraud API latency
curl -w "@curl_format.txt" -o /dev/null -s http://localhost:8000/health

# Monitor queue status
# Check if analyzeInFlight is high
# In backend server.js

# Increase concurrency
ANALYZE_MAX_CONCURRENT=8

# Check network latency
# Backend to Fraud API should be <100ms in Docker

# Check Neo4j query performance
PROFILE MATCH (t:Transaction) SET t.fraud_score = 0.5 RETURN t;
```

---

### High Memory Usage

**Problem:** Application uses >1GB memory

**Solution:**

```bash
# Profile memory in Node.js
node --inspect server.js
# Open chrome://inspect in Chrome

# Check transaction history limit
# Frontend localStorage: max 10,000 records

# Reduce Neo4j cache
# In docker-compose.yml:
NEO4J_dbms_memory_heap_max__size: 1G

# Clear Redis cache
redis-cli FLUSHDB
```

---

### Slow Frontend Rendering

**Problem:** UI is sluggish or unresponsive

**Solution:**

```bash
# Profile performance
# DevTools → Performance tab
# Record 5 seconds, analyze

# Check Vue DevTools
# Vue DevTools → Performance
# Look for expensive components

# Optimize bundle size
npm run build
# Check dist/ size, should be <500KB gzipped

# Use production build
npm run preview

# Check for memory leaks
# DevTools → Memory tab
# Take heap snapshots
```

---

## 🔐 Security Issues

### Exposed Credentials

**Problem:** API keys in git history

**Solution:**

```bash
# Remove from git history
# Using BFG Repo-Cleaner
bfg --delete-files id_{dsa,rsa,ed25519}* -- --no-blob-protection

# Or if only .env file
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Remove sensitive data"
git push
```

---

### Weak Neo4j Password

**Problem:** Using default password in production

**Solution:**

```bash
# Change Neo4j password
# In Neo4j Browser: :changes password newpassword

# Update .env
NEO4J_PASSWORD=<strong_random_password>

# Restart
docker-compose restart neo4j
```

---

## 🆘 Getting Help

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# For backend
DEBUG=fraud-detection:* node --inspect server.js
```

### Collect Debug Information

```bash
# System info
uname -a
node --version
npm --version
docker --version

# Docker info
docker-compose ps
docker-compose logs --tail=50

# Frontend errors
# Browser → DevTools → Console → Copy errors

# Backend errors
docker-compose logs backend | tail -100

# Database info
docker-compose exec neo4j cypher-shell -u neo4j -p password "CALL db.version()"
docker-compose exec redis redis-cli INFO server
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Service not running | Start service, check port |
| `CORS policy` | Domain not whitelisted | Update CORS_ORIGIN |
| `Queue timeout` | Too many concurrent requests | Increase ANALYZE_MAX_CONCURRENT |
| `Circuit breaker open` | Fraud API down | Check Fraud API health |
| `OOMKilled` | Out of memory | Increase Docker memory |
| `ENOSPC` | No disk space | Clean up volumes |

---

## 📞 Support Resources

- **Project README:** [README.md](../README.md)
- **Setup Guide:** [SETUP.md](./SETUP.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference:** [API_REFERENCE.md](./API_REFERENCE.md)
- **Database Commands:** [DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md)

---

**Last Updated:** March 2026
