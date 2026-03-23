# Database Commands - Manual Neo4j & Redis Access

This guide shows how to interact with Neo4j and Redis directly without using the frontend, useful for debugging, data exploration, and database maintenance.

## 🗄️ Neo4j Database

### Access Neo4j Browser

**Web Interface (Recommended)**

1. Open browser and visit: `http://localhost:7474`
2. Default credentials:
   - Username: `neo4j`
   - Password: `password` (or your configured password)
3. You can now run Cypher queries directly

### Neo4j Connection via CLI

**Using neo4j-cli (if installed):**

```bash
# Connect to Neo4j
cypher-shell -a bolt://localhost:7687 -u neo4j -p password

# Example prompt
username: neo4j
password: ****
Connected to Neo4j using Bolt protocol version 5.0 at neo4j+s://localhost:7687.

neo4j@neo4j> 
```

---

## 📊 Neo4j Cypher Queries

### Basic Data Model

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

### Query: List All Transactions

```cypher
MATCH (t:Transaction)
RETURN t.transaction_id, t.fraud_score, t.decision, t.timestamp
LIMIT 20
ORDER BY t.timestamp DESC
```

**Output:**
```
┌────────────────────────────────┬──────────────┬──────────┬─────────────────────────┐
│ t.transaction_id               │ t.fraud_score│ t.decision│ t.timestamp             │
├────────────────────────────────┼──────────────┼──────────┼─────────────────────────┤
│ "txn_abc123def456"             │ 0.75         │ "REVIEW" │ "2026-03-23T10:30:00Z"  │
│ "txn_xyz789uvw012"             │ 0.25         │ "ALLOW"  │ "2026-03-23T10:29:00Z"  │
└────────────────────────────────┴──────────────┴──────────┴─────────────────────────┘
```

### Query: High-Risk Transactions

```cypher
MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t.transaction_id, t.fraud_score, t.decision, t.reasons
ORDER BY t.fraud_score DESC
LIMIT 50
```

### Query: Transactions by Country

```cypher
MATCH (t:Transaction)-[:FROM_IP]->(ip:IP)
WHERE ip.location = 'US'
RETURN COUNT(t) as transaction_count, 
       AVG(t.fraud_score) as avg_score,
       SUM(CASE WHEN t.decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked_count
```

### Query: User Transaction History

```cypher
# Find transactions for a specific user
MATCH (u:User {id: 'user_xyz'})-[:BELONGS_TO]-(t:Transaction)
RETURN t.transaction_id, t.amount, t.fraud_score, t.timestamp
ORDER BY t.timestamp DESC
LIMIT 50
```

### Query: Device Sharing Detection

```cypher
# Find devices shared across multiple users
MATCH (u1:User)-[r1:USES]->(d:Device)<-[r2:USES]-(u2:User)
WHERE u1.id < u2.id
RETURN d.id, COUNT(DISTINCT u1) as user_count, COLLECT(u1.id) as users
HAVING user_count > 1
```

### Query: High-Risk IP Addresses

```cypher
# Find IPs with high fraud rates
MATCH (t:Transaction)-[:FROM_IP]->(ip:IP)
WITH ip, COUNT(t) as tx_count, 
     SUM(CASE WHEN t.fraud_score > 0.7 THEN 1 ELSE 0 END) as high_risk_count
WHERE tx_count >= 10  # At least 10 transactions
RETURN ip.address, 
       tx_count,
       high_risk_count,
       round(100.0 * high_risk_count / tx_count, 2) as fraud_percentage
ORDER BY fraud_percentage DESC
```

### Query: Transaction Timeline by Hour

```cypher
# Fraud transactions by hour of day
MATCH (t:Transaction)
WHERE t.decision = 'BLOCK'
RETURN t.transaction_hour as hour,
       COUNT(t) as blocked_count,
       AVG(t.fraud_score) as avg_score
ORDER BY hour
```

### Query: Merchant Risk Analysis

```cypher
# Analyze fraud patterns by merchant category
MATCH (t:Transaction)-[:WITH_MERCHANT]->(m:Merchant)
WITH m.category as category,
     COUNT(t) as total_tx,
     SUM(CASE WHEN t.fraud_score > 0.7 THEN 1 ELSE 0 END) as risky_tx
RETURN category,
       total_tx,
       risky_tx,
       round(100.0 * risky_tx / total_tx, 2) as risk_percentage
ORDER BY risk_percentage DESC
```

### Query: Velocity Analysis (Rapid Transactions)

```cypher
# Users with multiple transactions in short time
MATCH (u:User)-[:BELONGS_TO]-(t1:Transaction),
      (u)-[:BELONGS_TO]-(t2:Transaction)
WHERE t1.transaction_id < t2.transaction_id
  AND abs(duration.inSeconds(datetime(t1.timestamp), datetime(t2.timestamp)).seconds) < 300
RETURN u.id,
       COUNT(DISTINCT t1.transaction_id) as rapid_transactions,
       AVG(t1.fraud_score) as avg_fraud_score
ORDER BY rapid_transactions DESC
LIMIT 20
```

### Query: Delete Old Transactions

```cypher
# Delete transactions older than 30 days
MATCH (t:Transaction)
WHERE datetime(t.timestamp) < datetime() - duration('P30D')
DETACH DELETE t
```

### Query: Clear All Data

```cypher
# WARNING: This deletes everything!
MATCH (n)
DETACH DELETE n
```

### Query: Get Database Stats

```cypher
# Get node and relationship counts
CALL apoc.meta.stats()
YIELD nodeCount, relCount, labelCount, relTypeCount
RETURN nodeCount, relCount, labelCount, relTypeCount
```

### Query: Create Indexes (Performance)

```cypher
# Create index on transaction_id for faster lookups
CREATE INDEX ON :Transaction(transaction_id)

# Create index on fraud_score for range queries
CREATE INDEX ON :Transaction(fraud_score)

# List all indexes
CALL db.indexes()
```

---

## 🔧 Neo4j CLI (cypher-shell) Examples

If you have `cypher-shell` installed:

```bash
# Connect interactively
cypher-shell -a bolt://localhost:7687 -u neo4j -p password

# Run query non-interactively
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  "MATCH (t:Transaction) RETURN COUNT(t) as count"

# Load queries from file
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  -f queries.cypher

# Export results to CSV
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  --format csv \
  "MATCH (t:Transaction) RETURN t.transaction_id, t.fraud_score" \
  > transactions.csv
```

---

## 💾 Redis Database

### Access Redis CLI

**Connect to Redis:**

```bash
# If Redis is running locally
redis-cli

# If using Docker
docker exec -it fraudDetectionEngineFrontend_redis_1 redis-cli

# Remote connection
redis-cli -h 127.0.0.1 -p 6379 -a your_password
```

### Redis Connection Status

```bash
> PING
PONG

> INFO server
# Shows server info including version, uptime, etc.
```

---

## 📋 Redis Commands

### General Commands

```bash
# Get server info
INFO

# Get all keys
KEYS *

# Get all keys matching pattern
KEYS "heatmap:*"

# Get key count
DBSIZE

# Flush current database (delete all keys)
FLUSHDB

# Flush all databases
FLUSHALL

# Get memory usage
INFO memory

# Monitor real-time commands
MONITOR
```

### Data Inspection

```bash
# Get value of a key
GET key_name

# Get key type
TYPE key_name

# Get TTL (time to live) in seconds
TTL key_name

# Get all keys and values of a pattern
SCAN 0 MATCH "heatmap:*"

# List all hash fields
HGETALL heatmap:hourly:2026-03-23
```

### Cache Management

```bash
# Delete specific key
DEL key_name

# Delete multiple keys
DEL key1 key2 key3

# Delete keys matching pattern
EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "heatmap:*"

# Set expiration on key (seconds)
EXPIRE key_name 3600

# Check expiration
TTL key_name
```

### Cache Data Examples

```bash
# View cached heatmap data
HGETALL heatmap:hourly:2026-03-23

# View session data
GET session:xyz123

# View recent stats
GET recent_stats:last_hour
```

### Debugging Redis

```bash
# Get slow log entries
SLOWLOG GET 10

# Reset slow log
SLOWLOG RESET

# Get config value
CONFIG GET maxmemory

# Set config value
CONFIG SET maxmemory 1000000000

# Check persistence
INFO persistence
```

---

## 🔄 Common Database Tasks

### Task 1: Check Fraud Analysis Results

**Neo4j:**
```cypher
MATCH (t:Transaction)
WHERE t.fraud_score IS NOT NULL
RETURN t.transaction_id, 
       t.fraud_score, 
       t.decision, 
       t.reasons,
       t.timestamp
ORDER BY t.timestamp DESC
LIMIT 10
```

**Purpose:** View the most recent fraud analysis results in the database

---

### Task 2: Find Patterns in Fraudulent Transactions

**Neo4j:**
```cypher
MATCH (t:Transaction)
WHERE t.decision = 'BLOCK'
WITH t, t.reasons[0] as primary_reason
RETURN primary_reason, 
       COUNT(t) as fraud_count,
       AVG(t.fraud_score) as avg_score
GROUP BY primary_reason
ORDER BY fraud_count DESC
```

**Purpose:** Identify the most common fraud reasons

---

### Task 3: Monitor Cache Performance

**Redis:**
```bash
# Get cache hit/miss stats
INFO stats

# Monitor commands in real-time
MONITOR

# Get memory breakdown by key
MEMORY DOCTOR
```

**Purpose:** Check Redis performance and memory usage

---

### Task 4: Analyze Merchant Risk

**Neo4j:**
```cypher
MATCH (t:Transaction)-[:WITH_MERCHANT]->(m:Merchant)
RETURN m.category,
       COUNT(t) as total_transactions,
       AVG(t.fraud_score) as average_fraud_score,
       MAX(t.fraud_score) as max_fraud_score,
       SUM(CASE WHEN t.decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked_count
GROUP BY m.category
ORDER BY average_fraud_score DESC
```

**Purpose:** Identify high-risk merchant categories

---

### Task 5: Audit Trail - Recent Transactions

**Neo4j:**
```cypher
MATCH (u:User)-[rel:BELONGS_TO]-(t:Transaction)
RETURN t.transaction_id,
       u.id,
       t.amount,
       t.fraud_score,
       t.decision,
       t.timestamp
ORDER BY t.timestamp DESC
LIMIT 100
```

**Purpose:** Get recent transaction audit trail

---

### Task 6: Clear Cached Heatmap Data

**Redis:**
```bash
# View cached heatmaps
KEYS "heatmap:*"

# Delete all heatmap cache
DEL heatmap:hourly:2026-03-23 heatmap:daily:2026-03 heatmap:country:2026

# Or delete all heatmap keys at once
EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "heatmap:*"
```

**Purpose:** Refresh cached data (cache will be regenerated on next request)

---

### Task 7: Backup Transaction Data

**Neo4j:**
```bash
# Using Docker
docker exec fraudDetectionEngineFrontend_neo4j_1 \
  neo4j-admin database dump neo4j /tmp/neo4j_backup.dump

# Copy backup to local machine
docker cp fraudDetectionEngineFrontend_neo4j_1:/tmp/neo4j_backup.dump ./neo4j_backup.dump
```

**Purpose:** Create database backup for disaster recovery

---

## 🛠️ Maintenance Commands

### Neo4j Maintenance

```bash
# Get database size
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  "CALL db.store.fileSize()"

# Analyze indexes
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  "CALL db.indexes()"

# Force garbage collection
cypher-shell -a bolt://localhost:7687 \
  -u neo4j -p password \
  "CALL java.lang.System.gc()"
```

### Redis Maintenance

```bash
# Check memory
redis-cli INFO memory

# Get memory stats
redis-cli MEMORY STATS

# Optimize memory
redis-cli MEMORY DOCTOR

# Save database to disk (persistence)
redis-cli BGSAVE

# Check last save time
redis-cli LASTSAVE
```

---

## 🔍 Troubleshooting

### Neo4j Connection Issues

```bash
# Test connection
curl http://localhost:7474

# Check logs
docker logs fraudDetectionEngineFrontend_neo4j_1

# Restart Neo4j
docker-compose restart neo4j
```

### Redis Connection Issues

```bash
# Test connection
redis-cli PING

# Check if running
docker ps | grep redis

# Restart Redis
docker-compose restart redis
```

### Query Performance Issues

```cypher
# Explain query plan
EXPLAIN MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t

# Get query execution stats
PROFILE MATCH (t:Transaction)
WHERE t.fraud_score > 0.7
RETURN t
```

---

## 📚 Quick Reference

### Common Neo4j Patterns

```cypher
# Match and return
MATCH (n) RETURN n LIMIT 5

# Filter results
MATCH (n) WHERE n.property = 'value' RETURN n

# Count results
MATCH (n) RETURN COUNT(n)

# Group and aggregate
MATCH (n) RETURN n.type, COUNT(*) GROUP BY n.type

# Delete nodes
MATCH (n) DELETE n

# Update properties
MATCH (n) SET n.property = 'new_value'
```

### Common Redis Patterns

```bash
# String operations
SET key value
GET key
APPEND key value
STRLEN key

# List operations
LPUSH mylist value
RPUSH mylist value
LPOP mylist
LRANGE mylist 0 -1

# Hash operations
HSET myhash field value
HGET myhash field
HGETALL myhash

# Set operations
SADD myset value
SMEMBERS myset
SCARD myset

# Sorted set operations
ZADD myzset 1 one
ZRANGE myzset 0 -1
```

---

## 📖 Further Resources

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/)
- [APOC Library](https://neo4j.com/developer/neo4j-apoc/)
- [Redis Documentation](https://redis.io/documentation)
- [Redis Commands Reference](https://redis.io/commands/)

---

**Last Updated:** March 2026
