// BullMQ worker — processes analytics event jobs from the 'analytics' queue.
// Writes CLUE_FOUND and HUNT_COMPLETE events to the analytics_events table.
// Offloads DB writes from the hot request path so submit latency stays low.

import { Worker, Job } from 'bullmq';
import { prisma } from '../config/database';
import { getRedis } from '../config/redis';
import type { AnalyticsJobData } from '../queues/index';

// Processes a single analytics job — inserts the event row into the DB
async function processAnalyticsJob(job: Job<AnalyticsJobData>): Promise<void> {
  const { eventType, huntId, clueId, playerId, sessionId, metadata } = job.data;

  await prisma.analyticsEvent.create({
    data: {
      eventType,
      huntId,
      clueId,
      playerId,
      sessionId,
      // Prisma JSON field requires explicit cast through unknown
      ...(metadata ? { metadata: metadata as unknown as object } : {}),
    },
  });
}

// Starts the analytics worker and returns it (so callers can close it on shutdown)
export function startAnalyticsWorker(): Worker<AnalyticsJobData> | null {
  const connection = getRedis();
  if (!connection) {
    console.log('⚠️  Analytics worker skipped — REDIS_URL not configured');
    return null;
  }

  const worker = new Worker<AnalyticsJobData>('analytics', processAnalyticsJob, {
    connection,
    concurrency: 5, // process up to 5 analytics events in parallel
  });

  worker.on('completed', (job) => {
    console.log(`analytics worker: completed job ${job.id} (${job.data.eventType})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`analytics worker: failed job ${job?.id}:`, err);
  });

  console.log('✅ Analytics worker started');
  return worker;
}
