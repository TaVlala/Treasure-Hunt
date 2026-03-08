// Health check route — used by Railway and monitoring tools to verify the server is alive.
// Also returns environment info to confirm the correct config is loaded.

import { Router, Request, Response } from 'express';
import type { ApiSuccess } from '@treasure-hunt/shared';

const router = Router();

interface HealthData {
  status: 'ok';
  environment: string;
  timestamp: string;
  version: string;
}

// GET /health — returns server status (no auth required)
router.get('/', (_req: Request, res: Response) => {
  const response: ApiSuccess<HealthData> = {
    success: true,
    data: {
      status: 'ok',
      environment: process.env['NODE_ENV'] ?? 'unknown',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
  res.status(200).json(response);
});

export default router;
