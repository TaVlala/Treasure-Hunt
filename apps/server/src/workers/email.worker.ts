// BullMQ worker — processes email jobs from the 'email' queue via Resend.
// Handles payment receipts, achievement unlock notifications, welcome emails, and sponsor invoices.
// Retries up to 3 times with exponential back-off on Resend API failures.

import { Worker, Job } from 'bullmq';
import { Resend } from 'resend';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import type { EmailJobData } from '../queues/index';
import { generateInvoicePdf, invoiceNumber, type InvoiceData } from '../lib/invoice';

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

// Builds the sponsor_invoice HTML body
function buildInvoiceEmailHtml(p: Record<string, unknown>): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <div style="background:#111;border-radius:8px;padding:24px 28px;margin-bottom:24px">
        <div style="font-size:18px;font-weight:800;color:#fff">🗺️ Treasure Hunt</div>
        <div style="font-size:11px;color:#f59e0b;margin-top:4px;letter-spacing:0.1em">SPONSOR INVOICE</div>
      </div>
      <h2 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">Invoice ${p['invoiceNumber'] as string}</h2>
      <p style="color:#555;margin:0 0 24px">Hi ${p['businessName'] as string}, your invoice is attached as a PDF.</p>
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#888;font-size:12px;padding:4px 0">Billing period</td>
            <td style="color:#111;font-size:12px;text-align:right">${p['periodStart'] as string} – ${p['periodEnd'] as string}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:4px 0">Amount paid</td>
            <td style="color:#111;font-size:14px;font-weight:700;text-align:right">${p['amount'] as string}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:4px 0">Reference</td>
            <td style="color:#555;font-size:11px;text-align:right">${p['stripeInvoiceId'] as string}</td>
          </tr>
        </table>
      </div>
      <p style="color:#888;font-size:12px">Questions? Reply to this email or contact contact@treasurehunt.app</p>
    </div>`;
}

// Processes a single email job — sends via Resend
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('email worker: RESEND_API_KEY not set — skipping email');
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const fromAddress = env.RESEND_FROM_EMAIL ?? 'noreply@treasurehunt.app';

  // Sponsor invoice emails attach a generated PDF
  if (job.data.type === 'sponsor_invoice') {
    const p = job.data.payload;
    const invoiceData: InvoiceData = {
      invoiceNumber: p['invoiceNumber'] as string,
      issuedAt: new Date(p['issuedAt'] as string),
      periodStart: new Date(p['periodStart'] as string),
      periodEnd: new Date(p['periodEnd'] as string),
      amountCents: p['amountCents'] as number,
      currency: p['currency'] as string,
      description: p['description'] as string,
      businessName: p['businessName'] as string,
      contactName: (p['contactName'] as string | null) ?? null,
      address: (p['address'] as string | null) ?? null,
      contactEmail: p['contactEmail'] as string,
      stripeInvoiceId: (p['stripeInvoiceId'] as string | null) ?? null,
    };

    const pdfBuffer = await generateInvoicePdf(invoiceData);

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: job.data.to,
      subject: job.data.subject,
      html: buildInvoiceEmailHtml(p),
      attachments: [
        {
          filename: `${invoiceData.invoiceNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    if (error) throw new Error(`Resend API error: ${error.message}`);
    return;
  }

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
