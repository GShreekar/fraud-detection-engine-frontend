# Deployment Guide

Complete guide to deploying the Fraud Detection Engine Frontend using Docker and Docker Compose.

## 🐳 Docker Overview

### Dockerfile Architecture

The project includes two Dockerfiles:

1. **Dockerfile.frontend** - Vue 3 SPA built with Nginx
2. **Dockerfile.backend** - Express.js Node server

### Build Multi-stage Approach

```dockerfile
# Frontend: Multi-stage build
FROM node:20-alpine AS builder
# ... build Vue app

FROM nginx:alpine
# ... serve with Nginx

# Backend: Runtime-only
FROM node:20-alpine
# ... run Express server
```

---

## 🚀 Docker Compose

### Available Profiles

Docker Compose provides three deployment profiles:

#### 1. **Standalone** (Default)

Complete stack with all services including Fraud API from Docker Hub.

```bash
docker-compose --profile standalone up --build
# or simply
docker-compose up --build
```

**Services Started:**
- Frontend (Nginx) - Port 80
- Backend (Express) - Port 3001
- Fraud API (Python) - Port 8000
- Neo4j - Port 7687
- Redis - Port 6379

**Use Case:** Demonstration, testing, production-like environment

---

#### 2. **Dev**

Frontend + Backend only; assumes Fraud API is running on host machine.

```bash
docker-compose --profile dev up --build
```

**Services Started:**
- Frontend (Nginx) - Port 80
- Backend (Express) - Port 3001
- Neo4j - Port 7687
- Redis - Port 6379

**Use Case:** Development with existing Fraud API, reduced resource usage

**Backend Configuration:**
```
FRAUD_API_URL=http://host.docker.internal:8000  # (Windows/macOS)
FRAUD_API_URL=http://172.17.0.1:8000            # (Linux)
```

---

#### 3. **Full**

Everything including Neo4j Browser and Redis Commander for monitoring.

```bash
docker-compose --profile full up --build
```

**Additional Services:**
- Neo4j Browser - Port 7474
- Redis Commander - Port 8081

**Use Case:** Development and debugging with UI tools for databases

---

## 📋 Docker Compose Services

### Frontend Service

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile.frontend
  ports:
    - "${FRONTEND_PORT:-80}:80"
  depends_on:
    backend:
      condition: service_started
  environment:
    # Nginx serves SPA, proxies API to backend
```

**Access:** `http://localhost`

### Backend Service

```yaml
backend:
  build:
    context: .
    dockerfile: Dockerfile.backend
  ports:
    - "${BACKEND_PORT:-3001}:3001"
  environment:
    PORT: 3001
    FRAUD_API_URL: ${FRAUD_API_URL:-http://fraud-api:8000}
    NEO4J_URI: bolt://neo4j:7687
    REDIS_URL: redis://redis:6379
  depends_on:
    neo4j:
      condition: service_healthy
    redis:
      condition: service_healthy
```

**Access:** `http://localhost:3001`

### Neo4j Service

```yaml
neo4j:
  image: neo4j:5-community
  ports:
    - "7474:7474"  # Browser
    - "7687:7687"  # Bolt protocol
  environment:
    NEO4J_AUTH: neo4j/password
    NEO4J_PLUGINS: '["apoc"]'
  volumes:
    - neo4j_data:/data
    - neo4j_logs:/logs
  healthcheck:
    test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1"]
    interval: 10s
    timeout: 5s
```

**Access:** `http://localhost:7474` (browser only in `full` profile)

### Redis Service

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "PING"]
    interval: 10s
    timeout: 5s
```

**Access:** Port 6379 (CLI only; UI only in `full` profile)

### Fraud API Service

```yaml
fraud-api:  # Only in standalone/full profiles
  image: ${FRAUD_API_IMAGE:-gshreekar/fraud-detection-engine:latest}
  ports:
    - "8000:8000"
  environment:
    NEO4J_URI: bolt://neo4j:7687
    REDIS_URL: redis://redis:6379
  depends_on:
    neo4j:
      condition: service_healthy
    redis:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 20s
    timeout: 15s
    retries: 8
    start_period: 45s
```

**Access:** `http://localhost:8000`

---

## ⚙️ Environment Configuration

### .env File

Create `.env` in project root:

```ini
# Ports
FRONTEND_PORT=80
BACKEND_PORT=3001

# URLs
FRAUD_API_URL=http://fraud-api:8000

# Neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Backend Performance
ANALYZE_MAX_CONCURRENT=4
ANALYZE_QUEUE_TIMEOUT_MS=20000
FRAUD_API_TIMEOUT_MS=8000
FRAUD_API_CIRCUIT_OPEN_MS=15000

# Fraud API Image
FRAUD_API_IMAGE=gshreekar/fraud-detection-engine:latest

# CORS
CORS_ORIGIN=*
```

### Environment Variables by Stage

**Development:**
```ini
FRAUD_API_URL=http://host.docker.internal:8000
NODE_ENV=development
DEBUG=true
```

**Staging:**
```ini
FRAUD_API_URL=https://fraud-api-staging.example.com
NODE_ENV=staging
DEBUG=false
```

**Production:**
```ini
FRAUD_API_URL=https://fraud-api-prod.example.com
NODE_ENV=production
DEBUG=false
CORS_ORIGIN=https://yourfrontend.com
```

---

## 🔨 Building Docker Images

### Build All Services

```bash
# Build all services
docker-compose build

# Build with no cache
docker-compose build --no-cache

# Build specific service
docker-compose build frontend
docker-compose build backend
```

### Build Frontend Only

```bash
docker build -f Dockerfile.frontend -t fraud-detection-frontend:latest .
```

### Build Backend Only

```bash
docker build -f Dockerfile.backend -t fraud-detection-backend:latest .
```

### Tag for Registry

```bash
# Tag image with registry
docker tag fraud-detection-frontend:latest myregistry.azurecr.io/fraud-detection-frontend:latest

# Push to registry
docker push myregistry.azurecr.io/fraud-detection-frontend:latest
```

---

## ▶️ Running Containers

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Start with specific profile
docker-compose --profile full up -d

# Start with build
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v

# Stop specific service
docker stop frauddetectionenginefrontend_backend_1
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart neo4j
```

---

## 🔍 Monitoring & Debugging

### View Container Status

```bash
# List running containers
docker-compose ps

# Show container details
docker ps

# Show container inspect details
docker inspect frauddetectionenginefrontend_backend_1
```

### View Logs

```bash
# All services
docker-compose logs

# Tail logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
docker-compose logs -f neo4j
```

### Execute Commands in Container

```bash
# Open bash in backend
docker-compose exec backend bash

# Run command
docker-compose exec backend npm list

# Open bash in Neo4j
docker-compose exec neo4j bash

# Run Redis CLI
docker-compose exec redis redis-cli
```

### Container Health Checks

```bash
# View health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check specific service
docker-compose ps neo4j
```

---

## 📊 Persistent Data

### Volumes

Data persists across container restarts:

```yaml
volumes:
  neo4j_data:      # Neo4j database files
  neo4j_logs:      # Neo4j logs
  redis_data:      # Redis RDB/AOF files
```

### Backup Data

```bash
# Backup Neo4j data
docker run --rm -v frauddetectionenginefrontend_neo4j_data:/data \
  -v $(pwd)/backup:/backup \
  neo4j:5-community \
  neo4j-admin database dump neo4j /backup/neo4j_backup.dump

# Backup Redis data
docker run --rm -v frauddetectionenginefrontend_redis_data:/data \
  -v $(pwd)/backup:/backup \
  redis:7-alpine \
  cp /data/dump.rdb /backup/redis_backup.rdb
```

### Restore Data

```bash
# Restore Neo4j
docker-compose down
docker volume rm frauddetectionenginefrontend_neo4j_data
docker run --rm -v frauddetectionenginefrontend_neo4j_data:/data \
  -v $(pwd)/backup:/backup \
  neo4j:5-community \
  neo4j-admin database load --from-path=/backup neo4j
docker-compose up -d neo4j

# Restore Redis
# Copy backup RDB to volume before starting
```

---

## 🚀 Production Deployment

### Production Checklist

- [ ] Use strong passwords for Neo4j
- [ ] Configure proper CORS origins
- [ ] Use HTTPS/TLS for all connections
- [ ] Set appropriate resource limits
- [ ] Configure logging and monitoring
- [ ] Set up automated backups
- [ ] Use environment-specific configurations
- [ ] Disable debug logging
- [ ] Configure health checks
- [ ] Set up load balancer

### Production Configuration

```yaml
# docker-compose.prod.yml
services:
  frontend:
    image: myregistry/fraud-detection-frontend:1.0.0
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  backend:
    image: myregistry/fraud-detection-backend:1.0.0
    restart: always
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  neo4j:
    image: neo4j:5-community
    restart: always
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_dbms_memory_heap_max__size: 2G
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

**Start:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Best Practices

### Image Security

```bash
# Scan image for vulnerabilities
docker scan fraud-detection-frontend:latest

# Use minimal base images
# ✓ alpine (5 MB)
# ✗ ubuntu (77 MB)

# Don't run as root
USER node  # In Dockerfile
```

### Network Security

```yaml
# Use internal network for databases
networks:
  fraud-net:
    driver: bridge
    internal: false

# Only expose necessary ports
ports:
  - "80:80"       # Frontend
  - "3001:3001"   # Backend API
# Don't expose: 7687, 6379, 8000
```

### Secret Management

```bash
# Don't hardcode secrets in .env
# Use Docker secrets in Swarm or K8s

# Alternative: Use .env file only for development
# In production: Use Docker secrets or environment service
docker secret create neo4j_password neo4j_password.txt
```

---

## 📈 Scaling

### Horizontal Scaling

```yaml
# Run multiple backend instances
backend-1:
  build:
    dockerfile: Dockerfile.backend
  
backend-2:
  build:
    dockerfile: Dockerfile.backend

backend-3:
  build:
    dockerfile: Dockerfile.backend

# Use load balancer
frontend:
  depends_on:
    - backend-1
    - backend-2
    - backend-3
```

### Vertical Scaling

Increase resources for single instance:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '4'      # Instead of '1'
        memory: 4G     # Instead of 1G
```

---

## 🔄 CI/CD Integration

### Build and Push to Registry

```bash
# Build image
docker build -f Dockerfile.frontend -t fraud-frontend:${VERSION} .

# Tag for registry
docker tag fraud-frontend:${VERSION} myregistry.azurecr.io/fraud-frontend:${VERSION}

# Push to registry
docker push myregistry.azurecr.io/fraud-frontend:${VERSION}

# Deploy
docker-compose pull
docker-compose up -d
```

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose build
      
      - name: Push to registry
        run: |
          docker tag fraud-frontend:latest myregistry.azurecr.io/fraud-frontend:${{ github.sha }}
          docker push myregistry.azurecr.io/fraud-frontend:${{ github.sha }}
      
      - name: Deploy
        run: |
          ssh deploy@server "cd /app && docker-compose pull && docker-compose up -d"
```

---

## 🆘 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check health
docker-compose ps

# Rebuild without cache
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001
netstat -ano | findstr :3001

# Kill process
kill -9 <PID>

# Or use different port
BACKEND_PORT=3002 docker-compose up -d
```

### Database Connection Failed

```bash
# Check containers running
docker-compose ps

# Check network
docker network ls
docker network inspect frauddetectionenginefrontend_fraud-net

# Restart databases
docker-compose restart neo4j redis
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase Docker memory limit
# (Docker Desktop: Settings → Resources → Memory)

# Or increase in compose file
deploy:
  resources:
    limits:
      memory: 4G
```

---

## 📚 Quick Reference

### Common Docker Compose Commands

```bash
# Up (start)
docker-compose up -d

# Down (stop)
docker-compose down

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Restart
docker-compose restart

# Build
docker-compose build

# Execute command
docker-compose exec service_name command

# Remove volumes
docker-compose down -v

# Remove all (containers, networks, volumes)
docker-compose down -v --remove-orphans
```

---

**Last Updated:** March 2026
