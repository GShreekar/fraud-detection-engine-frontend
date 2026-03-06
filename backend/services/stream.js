import { faker } from '@faker-js/faker';
import axios from 'axios';

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'AU', 'BR', 'IN', 'NG', 'RU', 'CN', 'MX', 'ZA', 'KE'];
const MERCHANT_CATEGORIES = ['retail', 'electronics', 'food_delivery', 'travel', 'gambling', 'crypto_exchange', 'luxury_goods', 'groceries'];
const PAYMENT_METHODS = ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'crypto'];

const PORT = process.env.PORT || 3001;
const ANALYZE_URL = process.env.STREAM_ANALYZE_URL || `http://localhost:${PORT}/api/analyze`;

function generateTransaction() {
  const country = faker.helpers.arrayElement(COUNTRIES);
  const hour = new Date().getHours();
  const amount = +(Math.random() * 2500 + 10).toFixed(2);

  return {
    request: {
      transaction_id: `txn_${faker.string.alphanumeric(12)}`,
      user_id: `user_${faker.string.alphanumeric(8)}`,
      amount,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      country,
      device_id: `dev_${faker.string.alphanumeric(8)}`,
      ip_address: faker.internet.ipv4(),
      merchant_id: `merchant_${faker.helpers.arrayElement(MERCHANT_CATEGORIES)}_${faker.number.int({ min: 1, max: 100 })}`,
      merchant_category: faker.helpers.arrayElement(MERCHANT_CATEGORIES),
      payment_method: faker.helpers.arrayElement(PAYMENT_METHODS),
      is_international: Math.random() > 0.6,
      customer_age: faker.number.int({ min: 18, max: 85 }),
      account_age_days: faker.number.int({ min: 1, max: 3650 }),
      transaction_hour: hour,
    },
  };
}

export function setupStreamNamespace(io) {
  const streamNsp = io.of('/stream');

  streamNsp.on('connection', (socket) => {
    console.log(`[Stream] Client connected: ${socket.id}`);

    let interval = null;
    let speed = 1000; // ms between emissions
    let inFlight = false;

    const emitTransaction = async () => {
      if (inFlight) return;
      inFlight = true;

      const tx = generateTransaction();
      try {
        const { data } = await axios.post(
          ANALYZE_URL,
          tx.request,
          {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        socket.emit('transaction', {
          transaction_id: tx.request.transaction_id,
          request: tx.request,
          response: data,
        });
      } catch (err) {
        socket.emit('stream_error', {
          message: 'Failed to fetch transaction analysis from Fraud API',
          details: err.response?.data || err.message,
        });
      } finally {
        inFlight = false;
      }
    };

    socket.on('start', () => {
      if (interval) clearInterval(interval);
      interval = setInterval(emitTransaction, speed);
      socket.emit('status', { playing: true, speed });
      console.log(`[Stream] Started for ${socket.id} at ${speed}ms`);
    });

    socket.on('stop', () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      socket.emit('status', { playing: false, speed });
      console.log(`[Stream] Stopped for ${socket.id}`);
    });

    socket.on('setSpeed', (multiplier) => {
      const clampedMultiplier = Math.max(0.5, Math.min(10, multiplier));
      speed = Math.round(1000 / clampedMultiplier);
      if (interval) {
        clearInterval(interval);
        interval = setInterval(emitTransaction, speed);
      }
      socket.emit('status', { playing: !!interval, speed });
      console.log(`[Stream] Speed set to ${clampedMultiplier}x (${speed}ms) for ${socket.id}`);
    });

    socket.on('disconnect', () => {
      if (interval) clearInterval(interval);
      console.log(`[Stream] Client disconnected: ${socket.id}`);
    });
  });
}
