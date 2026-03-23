# API Reference

Complete reference for all REST and WebSocket API endpoints.

## 📡 Base URLs

| Environment | Base URL |
|-------------|----------|
| Local Development | `http://localhost:3001` |
| Docker | `http://backend:3001` |
| Production | `https://api.yourfrontend.com` |

---

## 🔄 REST API Endpoints

### POST /api/analyze

Analyze a transaction for fraud risk.

**Request:**

```json
{
  "transaction_id": "txn_abc123def456",
  "user_id": "user_john_doe",
  "amount": 250.50,
  "currency": "USD",
  "timestamp": "2026-03-23T10:30:00Z",
  "country": "US",
  "device_id": "device_iphone12",
  "ip_address": "203.0.113.42",
  "merchant_id": "merchant_electronics_001",
  "merchant_category": "electronics",
  "payment_method": "credit_card",
  "is_international": false,
  "customer_age": 35,
  "account_age_days": 730,
  "transaction_hour": 10
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transaction_id` | string | ✓ | Unique transaction identifier |
| `user_id` | string | ✓ | User making the transaction |
| `amount` | number | ✓ | Transaction amount |
| `currency` | string | ✓ | ISO 4217 currency code |
| `timestamp` | string (ISO 8601) | ✓ | Transaction time |
| `country` | string (ISO 3166-1 alpha-2) | ✓ | Transaction country |
| `device_id` | string | ✓ | Device identifier |
| `ip_address` | string (IPv4) | ✓ | IP address |
| `merchant_id` | string | ✓ | Merchant identifier |
| `merchant_category` | string | ✓ | Merchant category |
| `payment_method` | string | ✓ | Payment method used |
| `is_international` | boolean | ✓ | Cross-border transaction |
| `customer_age` | integer | ✓ | Customer age |
| `account_age_days` | integer | ✓ | Account age in days |
| `transaction_hour` | integer (0-23) | ✓ | Transaction hour |

**Response (200 OK):**

```json
{
  "transaction_id": "txn_abc123def456",
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

**Response (400 Bad Request):**

```json
{
  "error": "Invalid request: missing required field 'amount'",
  "statusCode": 400
}
```

**Response (503 Service Unavailable):**

```json
{
  "error": "Queue timeout - too many concurrent requests",
  "statusCode": 503
}
```

**Status Codes:**
- `200` - Analysis successful
- `400` - Invalid request parameters
- `500` - Internal server error
- `503` - Service unavailable (queue full or circuit breaker open)

**Example using curl:**

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_test_001",
    "user_id": "user_test",
    "amount": 250,
    "currency": "USD",
    "timestamp": "2026-03-23T10:30:00Z",
    "country": "US",
    "device_id": "dev_test",
    "ip_address": "192.168.1.1",
    "merchant_id": "merchant_1",
    "merchant_category": "electronics",
    "payment_method": "credit_card",
    "is_international": false,
    "customer_age": 35,
    "account_age_days": 730,
    "transaction_hour": 10
  }'
```

---

### GET /api/graph/network

Fetch network graph data for visualization.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `user_id` | string | - | Filter by specific user (optional) |
| `depth` | integer | 2 | Relationship depth (1-5) |
| `limit` | integer | 100 | Maximum nodes to return |

**Request:**

```
GET /api/graph/network?depth=2&limit=50
GET /api/graph/network?user_id=user_xyz&depth=3
```

**Response (200 OK):**

```json
{
  "nodes": [
    {
      "id": "user_1",
      "type": "user",
      "label": "user_1",
      "transactions": 45,
      "avgFraudScore": 0.35
    },
    {
      "id": "device_1",
      "type": "device",
      "label": "iPhone 12",
      "transactions": 12,
      "avgFraudScore": 0.32
    },
    {
      "id": "ip_203.0.113.42",
      "type": "ip",
      "label": "203.0.113.42",
      "location": "New York, US",
      "transactions": 56,
      "avgFraudScore": 0.41
    }
  ],
  "links": [
    {
      "source": "user_1",
      "target": "device_1",
      "type": "USES",
      "count": 12
    },
    {
      "source": "device_1",
      "target": "ip_203.0.113.42",
      "type": "FROM_IP",
      "count": 12
    }
  ]
}
```

**Response (500 Error):**

```json
{
  "error": "Failed to query graph database",
  "statusCode": 500
}
```

**Example using curl:**

```bash
curl "http://localhost:3001/api/graph/network?depth=2&limit=50"
```

---

### GET /api/analytics/heatmap

Fetch heatmap data for visualization.

**Query Parameters:**

| Parameter | Type | Options | Default | Description |
|-----------|------|---------|---------|-------------|
| `type` | string | hourly, daily, country | hourly | Heatmap type |
| `period` | integer | 1-365 | 7 | Period (days) |
| `country` | string | ISO 3166-1 | - | Filter by country (optional) |

**Request:**

```
GET /api/analytics/heatmap?type=hourly&period=7
GET /api/analytics/heatmap?type=country
GET /api/analytics/heatmap?type=daily&country=US
```

**Response - Hourly Heatmap (200 OK):**

```json
{
  "type": "hourly",
  "period": 7,
  "data": [
    {
      "hour": 0,
      "dayOfWeek": 0,
      "fraudCount": 5,
      "totalCount": 120,
      "avgScore": 0.35,
      "fraudPercentage": 4.17
    },
    {
      "hour": 1,
      "dayOfWeek": 0,
      "fraudCount": 3,
      "totalCount": 98,
      "avgScore": 0.28,
      "fraudPercentage": 3.06
    }
  ]
}
```

**Response - Country Heatmap (200 OK):**

```json
{
  "type": "country",
  "data": [
    {
      "country": "US",
      "countryName": "United States",
      "avgScore": 0.45,
      "transactionCount": 1250,
      "fraudCount": 180,
      "fraudPercentage": 14.4
    },
    {
      "country": "GB",
      "countryName": "United Kingdom",
      "avgScore": 0.52,
      "transactionCount": 890,
      "fraudCount": 210,
      "fraudPercentage": 23.6
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `500` - Server error

**Example using curl:**

```bash
curl "http://localhost:3001/api/analytics/heatmap?type=hourly&period=7"
```

---

### GET /api/analytics/summary

Get aggregated analytics summary.

**Query Parameters:** None

**Request:**

```
GET /api/analytics/summary
```

**Response (200 OK):**

```json
{
  "totalTransactions": 5420,
  "fraudulentTransactions": 1245,
  "fraudPercentage": 22.96,
  "averageFraudScore": 0.48,
  "minFraudScore": 0.02,
  "maxFraudScore": 0.99,
  "avgScoreByCountry": {
    "US": 0.45,
    "GB": 0.52,
    "DE": 0.38,
    "FR": 0.42,
    "JP": 0.35
  },
  "avgScoreByMerchantCategory": {
    "electronics": 0.61,
    "gambling": 0.78,
    "crypto_exchange": 0.82,
    "retail": 0.28,
    "food_delivery": 0.25
  },
  "topRiskyMerchants": [
    {
      "merchant_id": "merchant_crypto_1",
      "category": "crypto_exchange",
      "avgScore": 0.78,
      "transactionCount": 145
    },
    {
      "merchant_id": "merchant_gambling_5",
      "category": "gambling",
      "avgScore": 0.72,
      "transactionCount": 198
    }
  ],
  "topRiskyCountries": [
    {
      "country": "RU",
      "countryName": "Russia",
      "avgScore": 0.68,
      "transactionCount": 320
    },
    {
      "country": "NG",
      "countryName": "Nigeria",
      "avgScore": 0.65,
      "transactionCount": 210
    }
  ],
  "decisionCounts": {
    "ALLOW": 4175,
    "REVIEW": 950,
    "BLOCK": 295
  },
  "lastUpdated": "2026-03-23T10:45:00Z"
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

**Example using curl:**

```bash
curl "http://localhost:3001/api/analytics/summary"
```

---

### GET /api/health

Health check endpoint.

**Request:**

```
GET /api/health
```

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-23T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "connections": {
    "neo4j": {
      "status": "connected",
      "latency": 2
    },
    "redis": {
      "status": "connected",
      "latency": 1
    },
    "fraudApi": {
      "status": "connected",
      "latency": 45
    }
  }
}
```

**Status Codes:**
- `200` - All healthy
- `503` - Service unhealthy

---

## 🔌 WebSocket Events

### Connection URL

```
ws://localhost:3001/stream
```

### Server → Client Events

#### transaction

Emitted when a new transaction is analyzed.

**Payload:**

```json
{
  "transaction_id": "txn_stream_001",
  "user_id": "user_generated",
  "amount": 150.75,
  "currency": "USD",
  "fraud_score": 0.62,
  "decision": "REVIEW",
  "reasons": ["high_amount_transaction", "velocity_burst"],
  "confidence": 0.88,
  "timestamp": "2026-03-23T10:30:00Z",
  "country": "US"
}
```

**Example:**

```javascript
socket.on('transaction', (data) => {
  console.log(`Fraud Score: ${data.fraud_score}`);
  console.log(`Decision: ${data.decision}`);
  console.log(`Reasons: ${data.reasons.join(', ')}`);
});
```

---

#### stats_update

Emitted periodically with aggregated statistics.

**Payload:**

```json
{
  "fraudCount": 1245,
  "totalCount": 5420,
  "averageScore": 0.48,
  "fraudPercentage": 22.96,
  "lastUpdated": "2026-03-23T10:30:00Z"
}
```

**Example:**

```javascript
socket.on('stats_update', (stats) => {
  console.log(`Fraud Percentage: ${stats.fraudPercentage.toFixed(2)}%`);
  console.log(`Average Score: ${stats.averageScore.toFixed(2)}`);
});
```

---

### Client → Server Events

#### play

Start the transaction stream.

**Emit:**

```javascript
socket.emit('play');
```

**Response:** Stream begins emitting `transaction` events

---

#### pause

Stop the transaction stream.

**Emit:**

```javascript
socket.emit('pause');
```

**Response:** Stream stops emitting events

---

#### speed

Set the stream playback speed.

**Emit:**

```javascript
socket.emit('speed', { value: 2 });  // 2x speed
socket.emit('speed', { value: 0.5 }); // 0.5x speed
```

**Valid Range:** 0.5 - 10.0

**Response:** Stream emits at new speed

---

### Connection Lifecycle

```javascript
// Connect
const socket = io.connect('ws://localhost:3001/stream');

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('play');
});

// Listen for events
socket.on('transaction', (data) => {
  console.log('New transaction:', data);
});

socket.on('stats_update', (stats) => {
  console.log('Stats updated:', stats);
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Disconnect
socket.on('disconnect', () => {
  console.log('Disconnected');
});

// Cleanup
window.addEventListener('beforeunload', () => {
  socket.disconnect();
});
```

---

## 🔐 Error Responses

All endpoints return consistent error responses.

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "details": "Field 'amount' must be a positive number",
  "statusCode": 400
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Failed to process request",
  "statusCode": 500
}
```

### 503 Service Unavailable

```json
{
  "error": "Service unavailable",
  "message": "Too many concurrent requests or circuit breaker open",
  "statusCode": 503,
  "retryAfter": 15000
}
```

---

## 📝 Request/Response Examples

### JavaScript/Fetch

```javascript
// Analyze transaction
const response = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    transaction_id: 'txn_test_001',
    user_id: 'user_test',
    amount: 250,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    country: 'US',
    device_id: 'dev_test',
    ip_address: '192.168.1.1',
    merchant_id: 'merchant_1',
    merchant_category: 'electronics',
    payment_method: 'credit_card',
    is_international: false,
    customer_age: 35,
    account_age_days: 730,
    transaction_hour: new Date().getHours(),
  }),
});

const result = await response.json();
console.log(result);
```

### Python/Requests

```python
import requests
import json
from datetime import datetime

url = 'http://localhost:3001/api/analyze'
payload = {
    'transaction_id': 'txn_test_001',
    'user_id': 'user_test',
    'amount': 250,
    'currency': 'USD',
    'timestamp': datetime.now().isoformat() + 'Z',
    'country': 'US',
    'device_id': 'dev_test',
    'ip_address': '192.168.1.1',
    'merchant_id': 'merchant_1',
    'merchant_category': 'electronics',
    'payment_method': 'credit_card',
    'is_international': False,
    'customer_age': 35,
    'account_age_days': 730,
    'transaction_hour': datetime.now().hour,
}

response = requests.post(url, json=payload)
print(response.json())
```

---

## 🔄 Rate Limiting

**Concurrent Request Limit:** Configurable via `ANALYZE_MAX_CONCURRENT` (default: 4)

When limit is exceeded:
- Request is queued
- Queue timeout: `ANALYZE_QUEUE_TIMEOUT_MS` (default: 20000ms)
- If timeout exceeded: `503 Service Unavailable`

**Circuit Breaker:** 

If Fraud API fails:
- Circuit opens for `FRAUD_API_CIRCUIT_OPEN_MS` (default: 15000ms)
- All requests during open state: `503 Service Unavailable`
- After duration: Circuit closes and requests resume

---

**Last Updated:** March 2026
