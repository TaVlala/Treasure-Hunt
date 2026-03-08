// Main Express server entry point.
// Loads environment config, sets up middleware, registers routes, starts listening.
// Handles graceful shutdown to close the Prisma DB connection cleanly.

import 'dotenv/config';
import { env } from './config/env';
import { prisma } from './config/database';

import express from 'express';
import cors from 'cors';

import healthRouter from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// --- Middleware ---

// Parse JSON request bodies
app.use(express.json());

// CORS — allow requests from the admin panel and mobile dev server
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true, // allow cookies for refresh tokens
  }),
);

// --- Routes ---

// Health check — no auth required, used by Railway and monitoring
app.use('/health', healthRouter);

// Placeholder: all API routes will be added here in future chunks
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/hunts', huntRouter);

// --- Error handling ---

// Must be registered AFTER all routes
app.use(errorHandler);

// --- Start server ---

const server = app.listen(env.PORT, () => {
  console.log(`✅ Treasure Hunt API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health check: http://localhost:${env.PORT}/health`);
});

// --- Graceful shutdown ---

// Disconnect Prisma cleanly so DB connections are not left dangling
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('   ✅ DB connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
