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

// ------- Neo4j Connection -------
let neo4jDriver = null;
try {
  neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  await neo4jDriver.verifyConnectivity();
  console.log('✅ Connected to Neo4j');
} catch (err) {
  console.warn('⚠️  Neo4j not available, graph endpoints will return mock data:', err.message);
}

// ------- Redis Connection -------
let redisClient = null;
try {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.warn('Redis error:', err.message));
  await redisClient.connect();
  console.log('✅ Connected to Redis');
} catch (err) {
  console.warn('⚠️  Redis not available, caching disabled:', err.message);
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
    const response = await axios.post(`${FRAUD_API_URL}/api/v1/analyze`, req.body, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
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

  // If Neo4j is not available, return mock data
  if (!neo4jDriver) {
    return res.json(generateMockGraphData());
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

    res.json({ nodes: Array.from(nodes.values()), edges });
  } catch (err) {
    console.error('Neo4j query error:', err);
    res.status(500).json({ error: 'Failed to query graph database', details: err.message });
  } finally {
    await session.close();
  }
});

// ------- Analytics: Heatmap Data -------
app.get('/api/analytics/heatmap', async (req, res) => {
  const { range = '7d' } = req.query;

  // If Neo4j is not available, return mock data
  if (!neo4jDriver) {
    return res.json(generateMockHeatmapData());
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
    `, { range });

    const timeResult = await session.run(`
      MATCH (t:Transaction)
      WHERE t.timestamp > datetime() - duration($range)
      RETURN t.transaction_hour AS hour, 
             date(t.timestamp).dayOfWeek AS day,
             avg(t.fraud_score) AS avgScore, 
             count(t) AS count
      ORDER BY day, hour
    `, { range });

    const data = {
      geographic: geoResult.records.map((r) => ({
        country: r.get('country'),
        avgScore: r.get('avgScore'),
        count: r.get('count').toNumber(),
      })),
      temporal: timeResult.records.map((r) => ({
        hour: r.get('hour').toNumber(),
        day: r.get('day').toNumber(),
        avgScore: r.get('avgScore'),
        count: r.get('count').toNumber(),
      })),
    };

    if (redisClient?.isOpen) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    }

    res.json(data);
  } catch (err) {
    console.error('Heatmap query error:', err);
    res.status(500).json({ error: 'Failed to query analytics', details: err.message });
  } finally {
    await session.close();
  }
});

// ------- Mock Data Generators -------
function generateMockGraphData() {
  const nodes = [];
  const edges = [];
  const userCount = 5;
  const txPerUser = 4;

  for (let u = 0; u < userCount; u++) {
    const userId = `user_${u + 1}`;
    const deviceId = `device_${u + 1}`;
    const ipId = `ip_${(u % 3) + 1}`;

    nodes.push({ id: userId, type: 'User', label: userId, properties: { user_id: userId } });
    if (!nodes.find((n) => n.id === deviceId)) {
      nodes.push({ id: deviceId, type: 'Device', label: deviceId, properties: { device_id: deviceId } });
    }
    if (!nodes.find((n) => n.id === ipId)) {
      nodes.push({ id: ipId, type: 'IPAddress', label: ipId, properties: { ip_address: `192.168.1.${(u % 3) + 1}` } });
    }

    for (let t = 0; t < txPerUser; t++) {
      const txId = `tx_${u * txPerUser + t + 1}`;
      nodes.push({ id: txId, type: 'Transaction', label: txId, properties: { amount: Math.random() * 1000 } });
      edges.push({ source: userId, target: txId, type: 'PERFORMED' });
      edges.push({ source: txId, target: deviceId, type: 'USED_DEVICE' });
      edges.push({ source: txId, target: ipId, type: 'ORIGINATED_FROM' });
    }
  }

  return { nodes, edges };
}

function generateMockHeatmapData() {
  const countries = ['US', 'GB', 'NG', 'BR', 'IN', 'DE', 'FR', 'JP', 'CN', 'RU', 'AU', 'CA', 'MX', 'ZA', 'KE'];
  const geographic = countries.map((c) => ({
    country: c,
    avgScore: +(Math.random() * 0.8 + 0.1).toFixed(3),
    count: Math.floor(Math.random() * 500) + 10,
  }));

  const temporal = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      temporal.push({
        hour,
        day,
        avgScore: +(Math.random() * 0.6 + 0.2).toFixed(3),
        count: Math.floor(Math.random() * 100) + 1,
      });
    }
  }

  return { geographic, temporal };
}

// ------- WebSocket: Stream Namespace -------
setupStreamNamespace(io);

// ------- Start Server -------
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}`);
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
