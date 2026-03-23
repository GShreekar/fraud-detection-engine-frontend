# CI/CD & Testing Guide

Continuous integration, testing strategies, and deployment automation.

## 🧪 Testing Strategies

### Frontend Unit Testing

**Setup with Vitest (Recommended):**

```bash
npm install -D vitest @vitest/ui @vue/test-utils
```

**Example Test:**

```typescript
// tests/components/ScoreGauge.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ScoreGauge from '@/components/viz/ScoreGauge.vue';

describe('ScoreGauge.vue', () => {
  it('renders score correctly', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 0.75 }
    });
    expect(wrapper.find('.gauge').exists()).toBe(true);
  });
  
  it('applies correct color class for high score', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 0.85 }
    });
    expect(wrapper.classes()).toContain('high-risk');
  });
});
```

**Run Tests:**

```bash
npm run test
npm run test:ui          # Open test UI
npm run test:coverage    # Generate coverage report
```

### Backend Unit Testing

**Setup with Jest:**

```bash
npm install -D jest @types/jest ts-jest
```

**Example Test:**

```typescript
// tests/api.test.js
import request from 'supertest';
import app from '../server.js';

describe('POST /api/analyze', () => {
  it('returns fraud score', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({
        transaction_id: 'txn_test_001',
        user_id: 'user_test',
        amount: 250,
        // ... other fields
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('fraud_score');
    expect(response.body.fraud_score).toBeGreaterThanOrEqual(0);
    expect(response.body.fraud_score).toBeLessThanOrEqual(1);
  });
  
  it('handles queue timeout', async () => {
    // Send many concurrent requests
    const promises = Array(10).fill(null).map(() =>
      request(app).post('/api/analyze').send({...})
    );
    
    const results = await Promise.all(promises);
    const timeoutErrors = results.filter(r => r.status === 503);
    expect(timeoutErrors.length).toBeGreaterThan(0);
  });
});
```

**Run Tests:**

```bash
npm test
npm test -- --coverage
npm test -- --watch
```

### Integration Testing

**API Integration Tests:**

```typescript
// tests/integration.test.ts
describe('Transaction Flow', () => {
  it('analyzes transaction and persists to Neo4j', async () => {
    // 1. Analyze transaction
    const analyzeRes = await request(app)
      .post('/api/analyze')
      .send({ ... });
    
    expect(analyzeRes.status).toBe(200);
    const { transaction_id, fraud_score } = analyzeRes.body;
    
    // 2. Query Neo4j
    const queryRes = await axios.get('http://localhost:7474/db/data/cypher', {
      data: {
        query: `MATCH (t:Transaction {transaction_id: $id}) RETURN t`,
        params: { id: transaction_id }
      }
    });
    
    // 3. Verify data matches
    expect(queryRes.data[0].fraud_score).toBe(fraud_score);
  });
});
```

---

## 🚀 CI/CD with GitHub Actions

### Basic CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      neo4j:
        image: neo4j:5-community
        env:
          NEO4J_AUTH: neo4j/password
        options: >-
          --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 7687:7687
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli PING"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm install
          cd backend && npm install && cd ..
      
      - name: Lint frontend
        run: npm run lint
      
      - name: Build frontend
        run: npm run build
      
      - name: Test frontend
        run: npm run test:ui 2>/dev/null || npm run test
      
      - name: Test backend
        run: cd backend && npm test && cd ..
        env:
          NEO4J_URI: bolt://localhost:7687
          REDIS_URL: redis://localhost:6379
          FRAUD_API_URL: http://fraud-api:8000
```

### Build & Push Docker Images

Create `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.frontend
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/fraud-frontend:latest
            ${{ secrets.REGISTRY_URL }}/fraud-frontend:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.REGISTRY_URL }}/fraud-frontend:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_URL }}/fraud-frontend:buildcache,mode=max
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.backend
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/fraud-backend:latest
            ${{ secrets.REGISTRY_URL }}/fraud-backend:${{ github.sha }}
```

### Deploy to Production

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app/fraud-detection-frontend
            docker-compose pull
            docker-compose up -d
            docker-compose exec -T backend npm run migrate || true
```

---

## 🧬 Test Coverage

### Generate Coverage Reports

**Frontend:**

```bash
npm run test:coverage

# Creates coverage/
# View in browser: open coverage/index.html
```

**Backend:**

```bash
cd backend
npm test -- --coverage
cd ..
```

**Coverage Thresholds:**

```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,ts,vue}",
      "!src/**/*.d.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

---

## 📋 Testing Checklist

### Before Release

- [ ] All tests pass locally
- [ ] Code coverage >80%
- [ ] No console errors/warnings
- [ ] No TypeScript errors
- [ ] Linter passes
- [ ] Performance benchmarks acceptable
- [ ] Security audit passed
- [ ] E2E tests pass
- [ ] Load testing passed

### Production Deployment

- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Health checks verified
- [ ] HTTPS configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Team notified

---

## 📈 Quality Gates

### Code Quality Standards

```bash
# ESLint - Code style
npm run lint

# TypeScript - Type safety
npm run build  # Includes type checking

# Test coverage - Minimum 80%
npm run test:coverage

# Security audit
npm audit
```

### Performance Thresholds

```
- API response time: <500ms
- Frontend bundle: <500KB gzipped
- First Contentful Paint: <2s
- Lighthouse score: >80
```

---

## 🔄 Automated Workflows

### Pre-commit Hooks (Husky)

```bash
npm install -D husky lint-staged

# Setup
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run test"
```

### Pre-push Checks

```bash
npx husky add .husky/pre-push "npm run build && npm run test:coverage"
```

---

## 🚨 Error Tracking

### Sentry Integration (Optional)

```bash
npm install @sentry/vue
```

```typescript
// main.ts
import * as Sentry from "@sentry/vue";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## 📊 Monitoring in Production

### Application Monitoring

```bash
# Use PM2 for process management
npm install -g pm2

# Start app
pm2 start server.js --name "fraud-backend"

# Monitor
pm2 monit

# Logs
pm2 logs fraud-backend
```

### Health Checks

```bash
# Simple health endpoint
curl http://localhost:3001/api/health

# Include in monitoring:
*/5 * * * * curl -f http://localhost:3001/api/health || alert
```

---

**Last Updated:** March 2026
