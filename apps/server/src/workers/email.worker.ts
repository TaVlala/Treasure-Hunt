// BullMQ worker — processes email jobs from the 'email' queue via Resend.
// Handles payment receipts, achievement unlock notifications, and welcome emails.
// Retries up to 3 times with exponential back-off on Resend API failures.

import { Worker, Job } from 'bullmq';
import { Resend } from 'resend';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import type { EmailJobData } from '../queues/index';

// Build the HTML body for each email type
function buildEmailHtml(job: EmailJobData): string {
  const { type, payload } = job;

  if (type === 'payment_receipt') {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:800;color:#111">🎉 Payment Confirmed!</h1>
        <p style="color:#555;margin-top:12px">Your ticket for <strong>${payload['huntTitle'] as string}</strong> has been confirmed.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-top:20px">
          <p style="margin:0;color:#111"><strong>Amount:</strong> ${payload['amount'] as string}</p>
          <p style="margin:4px 0 0;color:#111"><strong>Reference:</strong> ${payload['paymentId'] as string}</p>
        </div>
        <p style="color:#555;margin-top:20px">Open the Treasure Hunt app to start your adventure!</p>
      </div>`;
  }

  if (type === 'achievement_unlock') {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:800;color:#111">🏆 Achievement Unlocked!</h1>
        <p style="color:#555;margin-top:12px">You earned a new achievement in Treasure Hunt:</p>
        <div style="background:#fef3c7;border-radius:8px;padding:16px;margin-top:20px;text-align:center">
          <div style="font-size:40px">${payload['icon'] as string}</div>
          <div style="font-size:18px;font-weight:700;color:#111;margin-top:8px">${payload['name'] as string}</div>
          <div style="color:#555;margin-top:4px">${payload['description'] as string}</div>
        </div>
      </div>`;
  }

  if (type === 'welcome') {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:800;color:#111">Welcome to Treasure Hunt! 🗺️</h1>
        <p style="color:#555;margin-top:12px">Hi ${payload['displayName'] as string},</p>
        <p style="color:#555">Your account is ready. Explore city hunts, collect points, and unlock achievements.</p>
        <p style="margin-top:20px"><a href="${payload['appUrl'] as string}" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Start Hunting</a></p>
      </div>`;
  }

  return `<p>${job.subject}</p>`;
}

// Processes a single email job — sends via Resend
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('email worker: RESEND_API_KEY not set — skipping email');
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const fromAddress = env.RESEND_FROM_EMAIL ?? 'noreply@treasurehunt.app';

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: job.data.to,
    subject: job.data.subject,
    html: buildEmailHtml(job.data),
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
}

// Starts the email worker and returns it (so callers can close it on shutdown)
export function startEmailWorker(): Worker<EmailJobData> | null {
  const connection = getRedis();
  if (!connection) {
    console.log('⚠️  Email worker skipped — REDIS_URL not configured');
    return null;
  }

  const worker = new Worker<EmailJobData>('email', processEmailJob, {
    connection,
    concurrency: 2, // Resend has generous limits; 2 is sufficient for now
  });

  worker.on('completed', (job) => {
    console.log(`email worker: sent "${job.data.subject}" to ${job.data.to}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`email worker: failed job ${job?.id} (${job?.data.subject}):`, err);
  });

  console.log('✅ Email worker started');
  return worker;
}
