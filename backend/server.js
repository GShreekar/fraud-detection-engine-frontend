import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import axios from 'axios';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { setupStreamNamespace } from './services/stream.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Configuration
const PORT = process.env.PORT || 3001;
const FRAUD_API_URL = process.env.FRAUD_API_URL || 'http://localhost:8000';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Middleware
app.use(cors());
app.use(morgan('short'));
app.use(express.json());

async function persistAnalyzedTransaction(requestPayload, responsePayload) {
  if (!neo4jDriver) return;

  const session = neo4jDriver.session({ database: 'neo4j' });
  try {
    const tx = {
      transaction_id: requestPayload.transaction_id,
      user_id: requestPayload.user_id,
      device_id: requestPayload.device_id,
      ip_address: requestPayload.ip_address,
      amount: Number(requestPayload.amount ?? 0),
      currency: requestPayload.currency || 'USD',
      country: requestPayload.country || 'US',
      merchant_id: requestPayload.merchant_id || 'unknown',
      timestamp: requestPayload.timestamp || new Date().toISOString(),
      transaction_hour: Number.isInteger(requestPayload.transaction_hour)
        ? requestPayload.transaction_hour
        : new Date(requestPayload.timestamp || Date.now()).getHours(),
      fraud_score: Number(responsePayload?.fraud_score ?? 0),
      decision: responsePayload?.decision || 'ALLOW',
      reasons: Array.isArray(responsePayload?.reasons) ? responsePayload.reasons : [],
    };

    await session.run(
      `
      MERGE (u:User {user_id: $user_id})
      MERGE (d:Device {device_id: $device_id})
      MERGE (ip:IPAddress {ip_address: $ip_address})
      MERGE (t:Transaction {transaction_id: $transaction_id})
      SET t.amount = $amount,
          t.currency = $currency,
          t.country = $country,
          t.timestamp = datetime($timestamp),
          t.transaction_hour = $transaction_hour,
          t.fraud_score = $fraud_score,
          t.decision = $decision,
          t.reasons = $reasons
      MERGE (u)-[:PERFORMED]->(t)
      MERGE (t)-[:USED_DEVICE]->(d)
      MERGE (t)-[:ORIGINATED_FROM]->(ip)
      `,
      tx
    );
  } catch (err) {
    console.warn('[Neo4j] Persist transaction failed:', err.message);
  } finally {
    await session.close();
  }

  if (redisClient?.isOpen) {
    try {
      const keys = await redisClient.keys('heatmap:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (err) {
      console.warn('[Redis] Heatmap cache invalidation failed:', err.message);
    }
  }
}

function neo4jToNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ------- Neo4j Connection -------
let neo4jDriver = null;
try {
  neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  await neo4jDriver.verifyConnectivity();
  console.log('[Neo4j] Connected');
} catch (err) {
  console.warn('[Neo4j] Not available, graph/heatmap endpoints will return empty data:', err.message);
}

// ------- Redis Connection -------
let redisClient = null;
try {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.warn('Redis error:', err.message));
  await redisClient.connect();
  console.log('[Redis] Connected');
} catch (err) {
  console.warn('[Redis] Not available, caching disabled:', err.message);
}

// ------- Health Check -------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      fraudApi: FRAUD_API_URL,
      neo4j: neo4jDriver ? 'connected' : 'unavailable',
      redis: redisClient?.isOpen ? 'connected' : 'unavailable',
    },
  });
});

// ------- Proxy: Analyze Transaction -------
app.post('/api/analyze', async (req, res) => {
  try {
    const response = await axios.post(`${FRAUD_API_URL}/api/v1/transactions/analyze`, req.body, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    await persistAnalyzedTransaction(req.body, response.data);

    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Fraud Detection API is unavailable',
        details: `Cannot reach ${FRAUD_API_URL}`,
      });
    }
    const status = err.response?.status || 500;
    res.status(status).json({
      error: err.response?.data || err.message,
    });
  }
});

// ------- Graph: Network Subgraph -------
app.get('/api/graph/network', async (req, res) => {
  const { user_id, transaction_id, limit = 100 } = req.query;

  // If Neo4j is not available, return empty graph (no mock data)
  if (!neo4jDriver) {
    return res.status(503).json({
      error: 'Neo4j is unavailable',
      nodes: [],
      edges: [],
    });
  }

  const session = neo4jDriver.session({ database: 'neo4j' });
  try {
    let query;
    const params = { limit: neo4j.int(parseInt(limit)) };

    if (user_id) {
      query = `
        MATCH (u:User {user_id: $userId})-[r1:PERFORMED]->(t:Transaction)
        OPTIONAL MATCH (t)-[r2:USED_DEVICE]->(d:Device)
        OPTIONAL MATCH (t)-[r3:ORIGINATED_FROM]->(ip:IPAddress)
        RETURN u, t, d, ip, r1, r2, r3
        LIMIT $limit
      `;
      params.userId = user_id;
    } else if (transaction_id) {
      query = `
        MATCH (u:User)-[r1:PERFORMED]->(t:Transaction {transaction_id: $txId})
        OPTIONAL MATCH (t)-[r2:USED_DEVICE]->(d:Device)
        OPTIONAL MATCH (t)-[r3:ORIGINATED_FROM]->(ip:IPAddress)
        RETURN u, t, d, ip, r1, r2, r3
        LIMIT $limit
      `;
      params.txId = transaction_id;
    } else {
      query = `
        MATCH (u:User)-[r1:PERFORMED]->(t:Transaction)
        OPTIONAL MATCH (t)-[r2:USED_DEVICE]->(d:Device)
        OPTIONAL MATCH (t)-[r3:ORIGINATED_FROM]->(ip:IPAddress)
        RETURN u, t, d, ip, r1, r2, r3
        ORDER BY t.timestamp DESC
        LIMIT $limit
      `;
    }

    const result = await session.run(query, params);
    const nodes = new Map();
    const edges = [];

    result.records.forEach((record) => {
      const u = record.get('u');
      const t = record.get('t');
      const d = record.get('d');
      const ip = record.get('ip');

      if (u && !nodes.has(u.elementId)) {
        nodes.set(u.elementId, {
          id: u.elementId,
          type: 'User',
          label: u.properties.user_id || u.elementId,
          properties: u.properties,
        });
      }
      if (t && !nodes.has(t.elementId)) {
        nodes.set(t.elementId, {
          id: t.elementId,
          type: 'Transaction',
          label: t.properties.transaction_id || t.elementId,
          properties: t.properties,
        });
      }
      if (d && !nodes.has(d.elementId)) {
        nodes.set(d.elementId, {
          id: d.elementId,
          type: 'Device',
          label: d.properties.device_id || d.elementId,
          properties: d.properties,
        });
      }
      if (ip && !nodes.has(ip.elementId)) {
        nodes.set(ip.elementId, {
          id: ip.elementId,
          type: 'IPAddress',
          label: ip.properties.ip_address || ip.elementId,
          properties: ip.properties,
        });
      }

      if (u && t) edges.push({ source: u.elementId, target: t.elementId, type: 'PERFORMED' });
      if (t && d) edges.push({ source: t.elementId, target: d.elementId, type: 'USED_DEVICE' });
      if (t && ip) edges.push({ source: t.elementId, target: ip.elementId, type: 'ORIGINATED_FROM' });
    });

    const graphResult = { nodes: Array.from(nodes.values()), edges };

    res.json(graphResult);
  } catch (err) {
    console.error('Neo4j query error:', err.message);
    res.status(500).json({
      error: 'Failed to query Neo4j graph data',
      details: err.message,
    });
  } finally {
    await session.close();
  }
});

// ------- Analytics: Heatmap Data -------
app.get('/api/analytics/heatmap', async (req, res) => {
  const { range = '7d' } = req.query;

  // Convert shorthand range (e.g. '7d') to ISO 8601 duration (e.g. 'P7D')
  const rangeMap = { '1d': 'P1D', '7d': 'P7D', '30d': 'P30D', '365d': 'P365D' };
  const isoDuration = rangeMap[range] || `P${range.replace(/d$/i, 'D')}`;

  // If Neo4j is not available, return empty heatmap (no mock data)
  if (!neo4jDriver) {
    return res.status(503).json({
      error: 'Neo4j is unavailable',
      geographic: [],
      temporal: [],
    });
  }

  // Check cache
  const cacheKey = `heatmap:${range}`;
  if (redisClient?.isOpen) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  }

  const session = neo4jDriver.session({ database: 'neo4j' });
  try {
    const geoResult = await session.run(`
      MATCH (t:Transaction)
      WHERE t.timestamp > datetime() - duration($range)
      RETURN t.country AS country, avg(t.fraud_score) AS avgScore, count(t) AS count
      ORDER BY avgScore DESC
    `, { range: isoDuration });

    const timeResult = await session.run(`
      MATCH (t:Transaction)
      WHERE t.timestamp > datetime() - duration($range)
      RETURN t.transaction_hour AS hour, 
             date(t.timestamp).dayOfWeek - 1 AS day,
             avg(t.fraud_score) AS avgScore, 
             count(t) AS count
      ORDER BY day, hour
    `, { range: isoDuration });

    const data = {
      geographic: geoResult.records.map((r) => ({
        country: r.get('country'),
        avgScore: neo4jToNumber(r.get('avgScore')),
        count: r.get('count').toNumber(),
      })),
      temporal: timeResult.records.map((r) => ({
        hour: neo4jToNumber(r.get('hour')),
        day: neo4jToNumber(r.get('day')),
        avgScore: neo4jToNumber(r.get('avgScore')),
        count: r.get('count').toNumber(),
      })),
    };

    if (redisClient?.isOpen) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }

    res.json(data);
  } catch (err) {
    console.error('Heatmap query error:', err.message);
    res.status(500).json({
      error: 'Failed to query Neo4j heatmap data',
      details: err.message,
    });
  } finally {
    await session.close();
  }
});

// ------- WebSocket: Stream Namespace -------
setupStreamNamespace(io);

// ------- Start Server -------
httpServer.listen(PORT, () => {
  console.log(`\n[Server] Backend running at http://localhost:${PORT}`);
  console.log(`   Fraud API proxy → ${FRAUD_API_URL}`);
  console.log(`   Neo4j → ${NEO4J_URI}`);
  console.log(`   Redis → ${REDIS_URL}\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (neo4jDriver) await neo4jDriver.close();
  if (redisClient?.isOpen) await redisClient.quit();
  httpServer.close();
  process.exit(0);
});
