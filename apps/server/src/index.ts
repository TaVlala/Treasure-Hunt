// Main Express server entry point.
// Loads environment config, sets up middleware, registers routes, starts listening.
// Handles graceful shutdown to close the Prisma DB connection cleanly.

import 'dotenv/config';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './lib/logger';
import { initSentry, setupSentryErrorHandler, sentryErrorHandler } from './lib/sentry';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { requestId } from './middleware/requestId';
import { authLimiter, gameLimiter, generalLimiter } from './middleware/rateLimiter';
import { sanitiseInput } from './middleware/sanitise';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getAnalyticsQueue, getEmailQueue, getCleanupQueue } from './queues/index';
import { startAnalyticsWorker } from './workers/analytics.worker';
import { startEmailWorker } from './workers/email.worker';
import { startCleanupWorker } from './workers/cleanup.worker';

import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import huntAdminRouter from './routes/hunt.admin.routes';
import clueAdminRouter from './routes/clue.admin.routes';
import sponsorAdminRouter from './routes/sponsor.admin.routes';
import redemptionAdminRouter from './routes/redemption.admin.routes';
import analyticsAdminRouter from './routes/analytics.admin.routes';
import prizeAdminRouter from './routes/prize.admin.routes';
import playerAdminRouter from './routes/player.admin.routes';
import teamRouter from './routes/team.routes';
import stripeRouter, { stripeWebhookHandler } from './routes/stripe.routes';
import gameRouter from './routes/game.routes';
import playerRouter from './routes/player.routes';
import uploadRouter from './routes/upload.routes';
import publicRouter from './routes/public.routes';
import sponsorPortalRouter from './routes/sponsor.portal.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Initialise Sentry before any routes (instruments Express request spans)
initSentry(app);

// --- Middleware ---

// Stamp every request with a unique UUID — echoed in X-Request-Id response header
app.use(requestId);

// Structured HTTP request logging via pino-http.
// Picks up req.id set by requestId middleware so log lines share the same request id.
app.use(
  pinoHttp({
    logger,
    // Attach requestId so log lines are correlatable
    genReqId: (req) => req.id,
    // Suppress noisy health-check logs in production
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

// Security headers — sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
// Registered first so every response gets security headers, including errors.
app.use(helmet());

// Broad rate limit applied to all API routes — catches scraping and runaway clients
app.use('/api/v1', generalLimiter);

// Stripe webhook requires the raw (unparsed) request body for signature verification.
// Must be registered BEFORE express.json() which would consume and transform the body.
app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);

// Parse JSON request bodies for all other routes
app.use(express.json());

// Parse cookies — required for reading the refresh token on /auth/refresh
app.use(cookieParser());

// CORS — allow requests from the admin panel and mobile dev server
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true, // allow cookies for refresh tokens
  }),
);

// Sanitise all string inputs — strips XSS vectors before reaching route handlers
app.use(sanitiseInput);

// --- Routes ---

// Health check — no auth required, used by Railway and monitoring
app.use('/health', healthRouter);

// Auth: register, login, refresh token, logout — strict rate limit (10/15min)
app.use('/api/v1/auth', authLimiter, authRouter);

// Hunt admin CRUD (requires admin JWT)
app.use('/api/v1/admin/hunts', huntAdminRouter);

// Clue admin CRUD — nested under hunts; :huntId param is merged via mergeParams: true
app.use('/api/v1/admin/hunts/:huntId/clues', clueAdminRouter);

// Sponsor admin CRUD
app.use('/api/v1/admin/sponsors', sponsorAdminRouter);

// Redemption validation — staff scan QR to confirm prize handoff
app.use('/api/v1/admin/redemptions', redemptionAdminRouter);

// Analytics event summaries — admin only
app.use('/api/v1/admin/analytics', analyticsAdminRouter);

// Prize (SponsorPrize) admin CRUD
app.use('/api/v1/admin/prizes', prizeAdminRouter);

// Player admin — list and manage player accounts
app.use('/api/v1/admin/players', playerAdminRouter);

// Team creation and joining — player-facing
app.use('/api/v1/teams', teamRouter);

// Stripe checkout + redirect pages (webhook is mounted above with raw body)
app.use('/api/v1/stripe', stripeRouter);

// Player game endpoints (proximity check, join hunt, submit answer, leaderboard) — moderate rate limit (60/min)
app.use('/api/v1/game', gameLimiter, gameRouter);

// Player discovery endpoints (list available hunts)
app.use('/api/v1/player', playerRouter);

// File upload — generates presigned R2 PUT URLs for direct client uploads
app.use('/api/v1/upload', uploadRouter);

// Public API routes allow any origin so hotel/partner websites can embed the widget.
// No credentials: true here — these endpoints require no auth.
app.use('/api/v1/public', cors({ origin: '*' }));

// Public hunt discovery — no auth required, used by landing pages and SEO
app.use('/api/v1/public', publicRouter);

// Sponsor self-serve portal (requires SPONSOR JWT)
app.use('/api/v1/sponsor', sponsorPortalRouter);

// --- Bull Board job monitor ---

// Mount Bull Board only if Redis is configured — admin-only job dashboard at /bull-board
const analyticsQ = getAnalyticsQueue();
const emailQ = getEmailQueue();
const cleanupQ = getCleanupQueue();

if (analyticsQ || emailQ || cleanupQ) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/bull-board');

  const queues = [analyticsQ, emailQ, cleanupQ]
    .filter(Boolean)
    .map((q) => new BullMQAdapter(q!));

  createBullBoard({ queues, serverAdapter });

  // Restrict Bull Board to admin JWT — simple header check
  app.use('/bull-board', (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  }, serverAdapter.getRouter());

  logger.info('Bull Board mounted at /bull-board');
}

// --- Error handling ---

// Sentry must be set up (via setupExpressErrorHandler) AFTER all routes are registered
setupSentryErrorHandler(app);

// Request-ID-aware Sentry error capture middleware (handles non-Express-error-handler paths)
app.use(sentryErrorHandler);

// Custom error handler — formats AppError and unhandled errors into a consistent JSON response
app.use(errorHandler);

// --- Start workers ---

// Workers are started after the HTTP server is listening.
// They run in the same process (simple deployment) and share the Redis connection.
const analyticsWorker = startAnalyticsWorker();
const emailWorker = startEmailWorker();
// Cleanup worker is async (schedules repeatable job) — fire-and-forget startup
void startCleanupWorker();

// --- Start server ---

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Treasure Hunt API running on http://localhost:${env.PORT}`,
  );
});

// --- Graceful shutdown ---

// Disconnect Prisma cleanly so DB connections are not left dangling
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully…');

  // Close BullMQ workers first so in-flight jobs complete
  await Promise.allSettled([analyticsWorker?.close(), emailWorker?.close()]);

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('DB connection closed — process exiting');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
