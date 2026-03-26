// Sentry error tracking and performance monitoring.
// Call initSentry() once at startup BEFORE routes are registered.
// Call setupSentryErrorHandler(app) AFTER all routes but BEFORE the custom errorHandler.

import * as Sentry from '@sentry/node';
import type { Express, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from './logger';

// Initialise Sentry — no-op when SENTRY_DSN is absent (local dev)
export const initSentry = (app: Express): void => {
  if (!env.SENTRY_DSN) {
    logger.debug('Sentry disabled — SENTRY_DSN not set');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    integrations: [
      // Instruments http module for distributed tracing
      Sentry.httpIntegration(),
      // Instruments Express routes and adds request context to events
      Sentry.expressIntegration(),
    ],
  });

  // Sentry v8+ requires setupExpressErrorHandler to be called on the app instance
  // We expose it here so index.ts can call it after all routes are registered
  logger.info({ dsn: env.SENTRY_DSN.slice(0, 20) + '…' }, 'Sentry initialised');
};

// Wire the Sentry error handler into the Express app.
// Must be called AFTER all route handlers and BEFORE the custom errorHandler.
// When SENTRY_DSN is absent this is a no-op.
export const setupSentryErrorHandler = (app: Express): void => {
  if (!env.SENTRY_DSN) return;
  Sentry.setupExpressErrorHandler(app);
};

// Middleware to capture the request ID on manual Sentry.captureException() calls.
// Also passes errors down to the next error handler (custom errorHandler).
export const sentryErrorHandler = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', String(req.id));
      Sentry.captureException(err);
    });
  }
  next(err);
};
