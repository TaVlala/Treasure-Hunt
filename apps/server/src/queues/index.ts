// BullMQ queue definitions — one queue per job category.
// Queues are only created when Redis is available; otherwise they are null.
// Workers consume from these same queues in separate processes (or same process for simplicity).

import { Queue } from 'bullmq';
import { getRedis } from '../config/redis';

// --- Job payload types ---

// Analytics event to write asynchronously
export interface AnalyticsJobData {
  eventType: 'CLUE_FOUND' | 'HUNT_COMPLETE';
  huntId: string;
  clueId?: string;
  playerId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

// Email job payload — send a receipt or notification email via Resend
export interface EmailJobData {
  to: string;
  subject: string;
  type: 'payment_receipt' | 'achievement_unlock' | 'welcome' | 'sponsor_invoice';
  payload: Record<string, unknown>;
}

// Cleanup job — no payload needed (scheduled daily)
export type CleanupJobData = Record<string, never>;

// --- Queue factory ---

// Creates a BullMQ Queue or returns null if Redis is unavailable
function makeQueue<T>(name: string): Queue<T> | null {
  const connection = getRedis();
  if (!connection) return null;
  return new Queue<T>(name, { connection });
}

// Lazily initialised singleton queues
let _analyticsQueue: Queue<AnalyticsJobData> | null | undefined;
let _emailQueue: Queue<EmailJobData> | null | undefined;
let _cleanupQueue: Queue<CleanupJobData> | null | undefined;

// Returns the analytics queue (or null when Redis is not configured)
export function getAnalyticsQueue(): Queue<AnalyticsJobData> | null {
  if (_analyticsQueue === undefined) _analyticsQueue = makeQueue<AnalyticsJobData>('analytics');
  return _analyticsQueue;
}

// Returns the email queue (or null when Redis is not configured)
export function getEmailQueue(): Queue<EmailJobData> | null {
  if (_emailQueue === undefined) _emailQueue = makeQueue<EmailJobData>('email');
  return _emailQueue;
}

// Returns the cleanup queue (or null when Redis is not configured)
export function getCleanupQueue(): Queue<CleanupJobData> | null {
  if (_cleanupQueue === undefined) _cleanupQueue = makeQueue<CleanupJobData>('cleanup');
  return _cleanupQueue;
}

// Convenience helper — enqueue an analytics event; silently no-ops if Redis is unavailable
export async function enqueueAnalytics(data: AnalyticsJobData): Promise<void> {
  const q = getAnalyticsQueue();
  if (!q) return;
  await q.add('analytics-event', data, { removeOnComplete: 100, removeOnFail: 50 });
}

// Convenience helper — enqueue an email; silently no-ops if Redis is unavailable
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  const q = getEmailQueue();
  if (!q) return;
  await q.add('send-email', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 50 });
}
