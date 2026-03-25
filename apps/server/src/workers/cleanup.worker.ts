// BullMQ worker — nightly cleanup of stale analytics events and expired sessions.
// Runs daily at midnight via a BullMQ repeatable job.
// Deletes analytics_events older than 90 days and GameSessions stuck in ACTIVE for over 30 days.

import { Worker, Job } from 'bullmq';
import { prisma } from '../config/database';
import { getRedis } from '../config/redis';
import { getCleanupQueue } from '../queues/index';
import type { CleanupJobData } from '../queues/index';

// Number of days to retain analytics events
const ANALYTICS_RETENTION_DAYS = 90;
// Number of days before an ACTIVE session is considered abandoned
const STALE_SESSION_DAYS = 30;

// Performs the nightly cleanup tasks
async function processCleanupJob(_job: Job<CleanupJobData>): Promise<void> {
  const analyticsExpiry = new Date();
  analyticsExpiry.setDate(analyticsExpiry.getDate() - ANALYTICS_RETENTION_DAYS);

  const sessionExpiry = new Date();
  sessionExpiry.setDate(sessionExpiry.getDate() - STALE_SESSION_DAYS);

  // Delete old analytics events
  const { count: eventsDeleted } = await prisma.analyticsEvent.deleteMany({
    where: { createdAt: { lt: analyticsExpiry } },
  });

  // Mark stale ACTIVE sessions as ABANDONED
  const { count: sessionsAbandoned } = await prisma.gameSession.updateMany({
    where: {
      status: 'ACTIVE',
      startedAt: { lt: sessionExpiry },
    },
    data: { status: 'ABANDONED' },
  });

  console.log(
    `cleanup worker: deleted ${eventsDeleted} analytics events, abandoned ${sessionsAbandoned} stale sessions`,
  );
}

// Schedules the repeatable daily cleanup job (idempotent — safe to call on every startup)
async function scheduleCleanupJob(): Promise<void> {
  const queue = getCleanupQueue();
  if (!queue) return;

  // Run at 02:00 UTC daily
  await queue.upsertJobScheduler('nightly-cleanup', { pattern: '0 2 * * *' }, {
    name: 'nightly-cleanup',
    data: {},
  });

  console.log('✅ Nightly cleanup job scheduled (02:00 UTC daily)');
}

// Starts the cleanup worker + schedules the repeatable job
export async function startCleanupWorker(): Promise<Worker<CleanupJobData> | null> {
  const connection = getRedis();
  if (!connection) {
    console.log('⚠️  Cleanup worker skipped — REDIS_URL not configured');
    return null;
  }

  await scheduleCleanupJob();

  const worker = new Worker<CleanupJobData>('cleanup', processCleanupJob, {
    connection,
    concurrency: 1, // Only one cleanup job at a time
  });

  worker.on('completed', () => {
    console.log('cleanup worker: nightly cleanup completed');
  });

  worker.on('failed', (job, err) => {
    console.error(`cleanup worker: failed job ${job?.id}:`, err);
  });

  console.log('✅ Cleanup worker started');
  return worker;
}
