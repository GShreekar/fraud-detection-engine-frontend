import { faker } from '@faker-js/faker';

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'AU', 'BR', 'IN', 'NG', 'RU', 'CN', 'MX', 'ZA', 'KE'];
const MERCHANT_CATEGORIES = ['retail', 'electronics', 'food_delivery', 'travel', 'gambling', 'crypto_exchange', 'luxury_goods', 'groceries'];
const PAYMENT_METHODS = ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'crypto'];
const DECISIONS = ['ALLOW', 'REVIEW', 'BLOCK'];
const DECISION_WEIGHTS = [0.7, 0.2, 0.1]; // 70% ALLOW, 20% REVIEW, 10% BLOCK

function weightedRandom(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateTransaction() {
  const decision = weightedRandom(DECISIONS, DECISION_WEIGHTS);
  const country = faker.helpers.arrayElement(COUNTRIES);
  const hour = new Date().getHours();
  const isHighRisk = ['NG', 'RU', 'CN'].includes(country);

  let fraudScore;
  switch (decision) {
    case 'ALLOW':
      fraudScore = +(Math.random() * 0.35).toFixed(4);
      break;
    case 'REVIEW':
      fraudScore = +(Math.random() * 0.35 + 0.4).toFixed(4);
      break;
    case 'BLOCK':
      fraudScore = +(Math.random() * 0.25 + 0.75).toFixed(4);
      break;
  }

  const reasons = [];
  if (isHighRisk) reasons.push('high_risk_country');
  if (fraudScore > 0.5) reasons.push('elevated_composite_score');
  if (Math.random() > 0.7) reasons.push('velocity_spike');
  if (Math.random() > 0.8) reasons.push('unusual_amount');
  if (Math.random() > 0.85) reasons.push('device_mismatch');
  if (Math.random() > 0.9) reasons.push('ip_geo_anomaly');

  const amount = decision === 'BLOCK'
    ? +(Math.random() * 5000 + 500).toFixed(2)
    : +(Math.random() * 500 + 10).toFixed(2);

  return {
    transaction_id: `txn_${faker.string.alphanumeric(12)}`,
    request: {
      transaction_id: `txn_${faker.string.alphanumeric(12)}`,
      user_id: `user_${faker.string.alphanumeric(8)}`,
      amount,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      country,
      device_id: `dev_${faker.string.alphanumeric(8)}`,
      ip_address: faker.internet.ipv4(),
      merchant_category: faker.helpers.arrayElement(MERCHANT_CATEGORIES),
      payment_method: faker.helpers.arrayElement(PAYMENT_METHODS),
      is_international: Math.random() > 0.6,
      customer_age: faker.number.int({ min: 18, max: 85 }),
      account_age_days: faker.number.int({ min: 1, max: 3650 }),
      transaction_hour: hour,
    },
    response: {
      transaction_id: `txn_${faker.string.alphanumeric(12)}`,
      fraud_score: fraudScore,
      decision,
      risk_level: decision === 'BLOCK' ? 'critical' : decision === 'REVIEW' ? 'high' : 'low',
      reasons,
      rules_triggered: reasons.map((r) => ({
        rule_name: r,
        score: +(Math.random() * 0.5 + 0.3).toFixed(3),
        details: `Rule ${r} triggered`,
      })),
      service_scores: [
        { name: 'Rules Engine', score: +(Math.random()).toFixed(3), weight: 0.3 },
        { name: 'Velocity Service', score: +(Math.random()).toFixed(3), weight: 0.35 },
        { name: 'Graph Analysis', score: +(Math.random()).toFixed(3), weight: 0.35 },
      ],
      processing_time_ms: faker.number.int({ min: 15, max: 250 }),
      timestamp: new Date().toISOString(),
    },
  };
}

export function setupStreamNamespace(io) {
  const streamNsp = io.of('/stream');

  streamNsp.on('connection', (socket) => {
    console.log(`🔌 Stream client connected: ${socket.id}`);

    let interval = null;
    let speed = 1000; // ms between emissions

    const emitTransaction = () => {
      const tx = generateTransaction();
      socket.emit('transaction', tx);
    };

    socket.on('start', () => {
      if (interval) clearInterval(interval);
      interval = setInterval(emitTransaction, speed);
      socket.emit('status', { playing: true, speed });
      console.log(`▶️  Stream started for ${socket.id} at ${speed}ms`);
    });

    socket.on('stop', () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      socket.emit('status', { playing: false, speed });
      console.log(`⏸️  Stream stopped for ${socket.id}`);
    });

    socket.on('setSpeed', (multiplier) => {
      const clampedMultiplier = Math.max(0.5, Math.min(10, multiplier));
      speed = Math.round(1000 / clampedMultiplier);
      if (interval) {
        clearInterval(interval);
        interval = setInterval(emitTransaction, speed);
      }
      socket.emit('status', { playing: !!interval, speed });
      console.log(`⚡ Speed set to ${clampedMultiplier}x (${speed}ms) for ${socket.id}`);
    });

    socket.on('disconnect', () => {
      if (interval) clearInterval(interval);
      console.log(`🔌 Stream client disconnected: ${socket.id}`);
    });
  });
}
