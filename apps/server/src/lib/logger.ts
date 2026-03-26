// Structured logger using pino.
// In production emits newline-delimited JSON; in development uses pino-pretty for readable output.
// Import this instead of console.log throughout the server.

import pino from 'pino';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

export const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    // In production, include timestamp as Unix epoch (cheap to emit, easy to index)
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base fields attached to every log line
    base: {
      pid: process.pid,
      service: 'treasure-hunt-api',
      env: env.NODE_ENV,
    },
    // Redact sensitive fields that might appear in request/response logs
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'body.password',
        'body.token',
      ],
      censor: '[REDACTED]',
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:HH:MM:ss',
        },
      })
    : undefined,
);
