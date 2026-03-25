// Redis connection for BullMQ job queues.
// Uses ioredis — a single connection instance shared across all queues and workers.
// REDIS_URL is optional: if absent, queues are disabled and jobs are no-ops.

import Redis from 'ioredis';
import { env } from './env';

// Lazily created connection — only instantiated if REDIS_URL is set
let _redis: Redis | null = null;

// Returns the shared Redis connection, or null if Redis is not configured
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;

  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    _redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    _redis.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }

  return _redis;
}

// Graceful shutdown — close connection cleanly
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
