// Health check route — used by Railway and monitoring tools to verify the server is alive.
// Returns environment info plus live dependency statuses (DB + Redis) and process metrics.

import { Router, Request, Response } from 'express';
import type { ApiSuccess } from '@treasure-hunt/shared';
import { prisma } from '../config/database';
import { getRedis } from '../config/redis';

const router = Router();

// Dependency check result
interface DepStatus {
  status: 'ok' | 'degraded' | 'unavailable';
  latencyMs?: number;
  error?: string;
}

interface HealthData {
  status: 'ok' | 'degraded';
  environment: string;
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  memoryMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  dependencies: {
    database: DepStatus;
    redis: DepStatus;
  };
}

// Ping the database — returns latency or an error string
async function checkDatabase(): Promise<DepStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'unavailable',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Ping Redis — returns latency, or marks as unavailable if not configured
async function checkRedis(): Promise<DepStatus> {
  const redis = getRedis();
  if (!redis) return { status: 'unavailable', error: 'REDIS_URL not configured' };

  const start = Date.now();
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'degraded',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// GET /health — returns server and dependency status (no auth required)
router.get('/', async (_req: Request, res: Response) => {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  // Overall status degrades if any required dependency is down
  const overallStatus: 'ok' | 'degraded' =
    database.status === 'unavailable' ? 'degraded' : 'ok';

  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round(bytes / 1024 / 1024);

  const data: HealthData = {
    status: overallStatus,
    environment: process.env['NODE_ENV'] ?? 'unknown',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: {
      rss: toMb(mem.rss),
      heapUsed: toMb(mem.heapUsed),
      heapTotal: toMb(mem.heapTotal),
    },
    dependencies: { database, redis },
  };

  const response: ApiSuccess<HealthData> = { success: true, data };
  // Return 503 when degraded so load balancers stop routing to this instance
  res.status(overallStatus === 'degraded' ? 503 : 200).json(response);
});

export default router;
