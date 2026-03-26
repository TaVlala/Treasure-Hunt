// Stripe payment routes — ticket checkout + native PaymentSheet + sponsor billing + webhook + redirect pages.
// Checkout:         POST /api/v1/stripe/checkout/:huntId         (browser Checkout Session)
// PaymentSheet:     POST /api/v1/stripe/payment-sheet/:huntId    (native Apple Pay / Google Pay)
// Sponsor billing:  POST /api/v1/stripe/sponsor/subscribe        (subscription Checkout Session)
// Billing portal:   GET  /api/v1/stripe/sponsor/billing-portal   (Stripe Billing Portal URL)
// Webhook:          POST /api/v1/stripe/webhook                   (raw body, mounted in index.ts)
// Pages:            GET  /api/v1/stripe/success|cancel            (HTML redirect targets)

import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { authenticate, requireRole } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { enqueueEmail } from '../queues/index';
import { logger } from '../lib/logger';
import type { ApiSuccess } from '@treasure-hunt/shared';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Returns a configured Stripe client, throwing 503 if key is missing
function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe payments are not configured', 503, 'SERVICE_UNAVAILABLE');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// Simple HTML page used for Stripe success/cancel redirects
function htmlPage(title: string, icon: string, heading: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;
background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;
justify-content:center;padding:24px}div{text-align:center;max-width:400px}
.icon{font-size:56px;margin-bottom:20px}.h1{font-size:24px;font-weight:800;
margin-bottom:12px}.p{font-size:15px;color:#888;line-height:1.5}</style></head>
<body><div><div class="icon">${icon}</div>
<div class="h1">${heading}</div>
<p class="p">${body}</p></div></body></html>`;
}

// ---------------------------------------------------------------------------
// Pages — opened inside the player's browser during Stripe Checkout
// ---------------------------------------------------------------------------

// GET /success — Stripe redirects here after successful payment
router.get('/success', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(
    htmlPage(
      'Payment Successful',
      '✅',
      'Payment Successful!',
      'Your ticket has been confirmed. Return to the Treasure Hunt app to start your hunt.',
    ),
  );
});

// GET /cancel — Stripe redirects here when player cancels
router.get('/cancel', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(
    htmlPage(
      'Payment Cancelled',
      '↩️',
      'Payment Cancelled',
      'Your payment was not completed. Return to the app and try again whenever you\'re ready.',
    ),
  );
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

// POST /checkout/:huntId — create a Stripe Checkout Session for a PAID hunt ticket.
// Returns { checkoutUrl } for the mobile app to open in a browser.
router.post(
  '/checkout/:huntId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const huntId = req.params['huntId'] as string;
      const playerId = req.user!.id;
      const stripe = getStripe();
      const baseUrl = env.APP_URL ?? `http://localhost:${env.PORT}`;

      // Hunt must exist, be ACTIVE, and be PAID
      const hunt = await prisma.hunt.findUnique({
        where: { id: huntId },
        select: {
          id: true,
          title: true,
          status: true,
          huntType: true,
          ticketPriceCents: true,
          currency: true,
        },
      });

      if (!hunt) throw new AppError('Hunt not found', 404, 'NOT_FOUND');
      if (hunt.status !== 'ACTIVE') throw new AppError('Hunt is not active', 409, 'HUNT_NOT_ACTIVE');
      if (hunt.huntType !== 'PAID') {
        throw new AppError('This hunt is free — no ticket required', 400, 'BAD_REQUEST');
      }
      if (!hunt.ticketPriceCents) {
        throw new AppError('Hunt has no ticket price configured', 400, 'BAD_REQUEST');
      }

      // Player must not already have a session for this hunt
      const existing = await prisma.gameSession.findUnique({
        where: { huntId_playerId: { huntId, playerId } },
      });
      if (existing) throw new AppError('You have already joined this hunt', 409, 'ALREADY_JOINED');

      // Create Stripe Checkout Session — store huntId + playerId in metadata for the webhook
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: hunt.currency.toLowerCase(),
              unit_amount: hunt.ticketPriceCents,
              product_data: {
                name: `${hunt.title} — Hunt Ticket`,
                description: 'Treasure Hunt entry ticket',
              },
            },
          },
        ],
        metadata: { huntId, playerId },
        success_url: `${baseUrl}/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/v1/stripe/cancel`,
      });

      const response: ApiSuccess<{ checkoutUrl: string }> = {
        success: true,
        data: { checkoutUrl: session.url! },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Payment Sheet — native Apple Pay / Google Pay via @stripe/stripe-react-native
// ---------------------------------------------------------------------------

// POST /payment-sheet/:huntId — create a PaymentIntent and return credentials for the native sheet.
// Returns { clientSecret, publishableKey } consumed by initPaymentSheet() on the mobile client.
router.post(
  '/payment-sheet/:huntId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const huntId = req.params['huntId'] as string;
      const playerId = req.user!.id;
      const stripe = getStripe();

      if (!env.STRIPE_PUBLISHABLE_KEY) {
        throw new AppError('Stripe publishable key is not configured', 503, 'SERVICE_UNAVAILABLE');
      }

      // Hunt must exist, be ACTIVE, and be PAID
      const hunt = await prisma.hunt.findUnique({
        where: { id: huntId },
        select: {
          id: true,
          title: true,
          status: true,
          huntType: true,
          ticketPriceCents: true,
          currency: true,
        },
      });

      if (!hunt) throw new AppError('Hunt not found', 404, 'NOT_FOUND');
      if (hunt.status !== 'ACTIVE') throw new AppError('Hunt is not active', 409, 'HUNT_NOT_ACTIVE');
      if (hunt.huntType !== 'PAID') {
        throw new AppError('This hunt is free — no ticket required', 400, 'BAD_REQUEST');
      }
      if (!hunt.ticketPriceCents) {
        throw new AppError('Hunt has no ticket price configured', 400, 'BAD_REQUEST');
      }

      // Player must not already have a session for this hunt
      const existing = await prisma.gameSession.findUnique({
        where: { huntId_playerId: { huntId, playerId } },
      });
      if (existing) throw new AppError('You have already joined this hunt', 409, 'ALREADY_JOINED');

      // Create PaymentIntent — store huntId + playerId in metadata for the webhook
      const paymentIntent = await stripe.paymentIntents.create({
        amount: hunt.ticketPriceCents,
        currency: hunt.currency.toLowerCase(),
        metadata: { huntId, playerId },
        automatic_payment_methods: { enabled: true },
        description: `${hunt.title} — Hunt Ticket`,
      });

      const response: ApiSuccess<{ clientSecret: string; publishableKey: string }> = {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret!,
          publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Shared helper — create GameSession + PlayerProgress + Payment atomically.
// Used by both checkout.session.completed and payment_intent.succeeded webhooks.
// ---------------------------------------------------------------------------

async function provisionHuntSession(
  huntId: string,
  playerId: string,
  stripePaymentId: string,
  description: string,
): Promise<string> {
  // Idempotency: skip if session already exists (webhook can fire multiple times)
  const existing = await prisma.gameSession.findUnique({
    where: { huntId_playerId: { huntId, playerId } },
  });
  if (existing) return existing.id;

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId },
    select: { ticketPriceCents: true, currency: true },
  });
  const clues = await prisma.clue.findMany({
    where: { huntId },
    orderBy: { orderIndex: 'asc' },
    select: { id: true },
  });

  const gameSession = await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({
      data: {
        huntId,
        playerId,
        totalClues: clues.length,
        status: 'ACTIVE',
        score: 0,
        cluesFound: 0,
      },
    });

    // First clue UNLOCKED, rest LOCKED
    await tx.playerProgress.createMany({
      data: clues.map((clue, i) => ({
        sessionId: session.id,
        clueId: clue.id,
        status: i === 0 ? ('UNLOCKED' as const) : ('LOCKED' as const),
        pointsEarned: 0,
        hintUsed: false,
      })),
    });

    await tx.payment.create({
      data: {
        paymentType: 'TICKET_PURCHASE',
        payerType: 'PLAYER',
        payerId: playerId,
        amountCents: hunt?.ticketPriceCents ?? 0,
        currency: hunt?.currency ?? 'USD',
        stripePaymentId,
        status: 'COMPLETED',
        description,
        huntId,
        sessionId: session.id,
      },
    });

    return session;
  });

  return gameSession.id;
}

// ---------------------------------------------------------------------------
// Email helper — enqueues a payment receipt email after a successful purchase
// ---------------------------------------------------------------------------

// Looks up the player's email + hunt title, then enqueues a receipt email job
async function sendPaymentReceiptEmail(
  huntId: string,
  playerId: string,
  paymentId: string,
): Promise<void> {
  const [hunt, player] = await Promise.all([
    prisma.hunt.findUnique({ where: { id: huntId }, select: { title: true, ticketPriceCents: true, currency: true } }),
    prisma.user.findUnique({ where: { id: playerId }, select: { email: true } }),
  ]);

  if (!hunt || !player?.email) return;

  const amount = hunt.ticketPriceCents
    ? `${(hunt.ticketPriceCents / 100).toFixed(2)} ${hunt.currency}`
    : 'Free';

  await enqueueEmail({
    to: player.email,
    subject: `Your ticket for ${hunt.title} is confirmed!`,
    type: 'payment_receipt',
    payload: { huntTitle: hunt.title, amount, paymentId },
  });
}

// ---------------------------------------------------------------------------
// Sponsor Billing — Stripe Subscriptions for recurring platform fees
// ---------------------------------------------------------------------------

// POST /stripe/sponsor/subscribe — create a Stripe Checkout Session in subscription mode.
// Redirects the sponsor to Stripe-hosted checkout to enter card details.
// On success, the checkout.session.completed webhook provisions the Subscription record.
router.post(
  '/sponsor/subscribe',
  authenticate,
  requireRole('sponsor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      const userId = req.user!.id;
      const baseUrl = env.APP_URL ?? `http://localhost:${env.PORT}`;
      const returnUrl =
        env.STRIPE_BILLING_PORTAL_RETURN_URL ?? `${baseUrl}/sponsor/dashboard`;

      // Look up sponsor by linked user account
      const sponsor = await prisma.sponsor.findUnique({
        where: { userId },
        select: {
          id: true,
          businessName: true,
          contactEmail: true,
          monthlyFeeCents: true,
          stripeCustomerId: true,
          subscription: { select: { status: true } },
        },
      });

      if (!sponsor) throw new AppError('Sponsor account not found', 404, 'NOT_FOUND');
      if (!sponsor.monthlyFeeCents) {
        throw new AppError(
          'No monthly fee is configured for your account — contact support.',
          400,
          'BAD_REQUEST',
        );
      }
      if (sponsor.subscription?.status === 'ACTIVE') {
        throw new AppError('You already have an active subscription.', 409, 'CONFLICT');
      }

      // Create Stripe Customer on first subscribe; reuse on retry
      let stripeCustomerId = sponsor.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name: sponsor.businessName,
          email: sponsor.contactEmail ?? undefined,
          metadata: { sponsorId: sponsor.id },
        });
        stripeCustomerId = customer.id;
        await prisma.sponsor.update({
          where: { id: sponsor.id },
          data: { stripeCustomerId: customer.id },
        });
      }

      // Checkout Session in subscription mode — price_data avoids requiring a pre-created Price
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              recurring: { interval: 'month' },
              unit_amount: sponsor.monthlyFeeCents,
              product_data: {
                name: 'Treasure Hunt Sponsor Platform Fee',
                description: `Monthly sponsor fee for ${sponsor.businessName}`,
              },
            },
          },
        ],
        // Store sponsorId so the webhook can link the Subscription record
        metadata: { sponsorId: sponsor.id },
        subscription_data: { metadata: { sponsorId: sponsor.id } },
        success_url: `${returnUrl}?billing=success`,
        cancel_url: `${returnUrl}?billing=cancelled`,
      });

      const response: ApiSuccess<{ checkoutUrl: string }> = {
        success: true,
        data: { checkoutUrl: session.url! },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
);

// GET /stripe/sponsor/billing-portal — return a Stripe Billing Portal session URL.
// Sponsor clicks "Manage Billing" in the portal → opens Stripe's hosted portal
// to update their card, view invoices, or cancel their subscription.
router.get(
  '/sponsor/billing-portal',
  authenticate,
  requireRole('sponsor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      const userId = req.user!.id;

      const sponsor = await prisma.sponsor.findUnique({
        where: { userId },
        select: { id: true, stripeCustomerId: true },
      });

      if (!sponsor) throw new AppError('Sponsor account not found', 404, 'NOT_FOUND');
      if (!sponsor.stripeCustomerId) {
        throw new AppError(
          'No billing account found. Please subscribe first.',
          400,
          'BAD_REQUEST',
        );
      }

      const returnUrl =
        env.STRIPE_BILLING_PORTAL_RETURN_URL ??
        `${env.APP_URL ?? 'http://localhost:3000'}/sponsor/dashboard`;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sponsor.stripeCustomerId,
        return_url: returnUrl,
      });

      const response: ApiSuccess<{ portalUrl: string }> = {
        success: true,
        data: { portalUrl: portalSession.url },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Webhook handler — exported and mounted with express.raw() in index.ts
// ---------------------------------------------------------------------------

// Handles Stripe webhook events.
// checkout.session.completed → browser Checkout flow (legacy)
// payment_intent.succeeded   → native PaymentSheet flow
// Both provision GameSession + PlayerProgress + Payment atomically.
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Stripe not configured' });
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig as string,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    res.status(400).json({ error: msg });
    return;
  }

  try {
    switch (event.type) {
      // ---- Player ticket purchase (browser Checkout) ----
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        // Sponsor subscription checkout — provision Subscription record
        if (checkoutSession.mode === 'subscription') {
          await handleSubscriptionCheckout(checkoutSession);
          res.status(200).json({ received: true });
          return;
        }

        // Player ticket checkout — provision GameSession
        const huntId = checkoutSession.metadata?.['huntId'];
        const playerId = checkoutSession.metadata?.['playerId'];

        if (!huntId || !playerId) {
          res.status(400).json({ error: 'Missing huntId/playerId in checkout session metadata' });
          return;
        }

        const stripePaymentId =
          typeof checkoutSession.payment_intent === 'string'
            ? checkoutSession.payment_intent
            : checkoutSession.id;

        const sessionId = await provisionHuntSession(
          huntId,
          playerId,
          stripePaymentId,
          'Hunt ticket purchase via Stripe Checkout',
        );

        void sendPaymentReceiptEmail(huntId, playerId, stripePaymentId).catch((err: unknown) =>
          logger.error({ err }, 'email enqueue error (checkout)'),
        );

        res.status(200).json({ received: true, sessionId });
        return;
      }

      // ---- Player ticket purchase (native PaymentSheet) ----
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const huntId = pi.metadata['huntId'];
        const playerId = pi.metadata['playerId'];

        if (!huntId || !playerId) {
          // PaymentIntent belongs to something else (e.g. subscription setup) — ignore
          res.status(200).json({ received: true });
          return;
        }

        const sessionId = await provisionHuntSession(
          huntId,
          playerId,
          pi.id,
          'Hunt ticket purchase via native PaymentSheet',
        );

        void sendPaymentReceiptEmail(huntId, playerId, pi.id).catch((err: unknown) =>
          logger.error({ err }, 'email enqueue error (payment_intent)'),
        );

        res.status(200).json({ received: true, sessionId });
        return;
      }

      // ---- Sponsor subscription lifecycle ----
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        res.status(200).json({ received: true });
        return;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await cancelSubscription(sub);
        res.status(200).json({ received: true });
        return;
      }

      // ---- Sponsor invoice events ----
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        res.status(200).json({ received: true });
        return;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        res.status(200).json({ received: true });
        return;
      }

      default:
        // Acknowledge unhandled event types so Stripe stops retrying
        res.status(200).json({ received: true });
    }
  } catch (err) {
    logger.error({ err }, 'Stripe webhook processing error');
    res.status(500).json({ error: 'Failed to process webhook event' });
  }
}

// ---------------------------------------------------------------------------
// Subscription webhook helpers
// ---------------------------------------------------------------------------

// Map Stripe subscription status to our SubscriptionStatus enum
function toSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'INCOMPLETE' | 'TRIALING' {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELLED';
    case 'trialing':
      return 'TRIALING';
    default:
      return 'INCOMPLETE';
  }
}

// Provision Subscription record after a successful sponsor subscription checkout
async function handleSubscriptionCheckout(
  checkoutSession: Stripe.Checkout.Session,
): Promise<void> {
  const sponsorId = checkoutSession.metadata?.['sponsorId'];
  if (!sponsorId) {
    logger.warn({ sessionId: checkoutSession.id }, 'Subscription checkout missing sponsorId');
    return;
  }

  // Retrieve the full subscription object to get period dates
  const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
  const stripeSubId =
    typeof checkoutSession.subscription === 'string'
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

  if (!stripeSubId) return;

  const sub = await stripe.subscriptions.retrieve(stripeSubId);
  await upsertSubscription(sub, sponsorId);
}

// Create or update our Subscription record to mirror Stripe's state.
// Period dates are set initially to the subscription start_date + 30 days as a placeholder;
// invoice.paid will update them with the real invoice period_start / period_end.
async function upsertSubscription(
  sub: Stripe.Subscription,
  sponsorIdOverride?: string,
): Promise<void> {
  const sponsorId = sponsorIdOverride ?? sub.metadata['sponsorId'];
  if (!sponsorId) {
    logger.warn({ stripeSubId: sub.id }, 'Cannot upsert subscription — no sponsorId in metadata');
    return;
  }

  const status = toSubscriptionStatus(sub.status);
  // start_date is the Unix timestamp when the subscription was created
  const periodStart = new Date(sub.start_date * 1000);
  // Approximate end of first period — invoice.paid will update with the real invoice dates
  const periodEnd = new Date(sub.start_date * 1000 + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      sponsorId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  logger.info({ sponsorId, stripeSubId: sub.id, status }, 'Subscription upserted');
}

// Mark subscription as CANCELLED and set Sponsor status to PAUSED
async function cancelSubscription(sub: Stripe.Subscription): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
    select: { sponsorId: true },
  });

  if (!existing) {
    logger.warn({ stripeSubId: sub.id }, 'Subscription not found for cancellation');
    return;
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: 'CANCELLED' },
    }),
    prisma.sponsor.update({
      where: { id: existing.sponsorId },
      data: { status: 'PAUSED' },
    }),
  ]);

  logger.info({ sponsorId: existing.sponsorId, stripeSubId: sub.id }, 'Subscription cancelled');
}

// Record a Payment (SPONSOR_FEE) and send a receipt email for a paid invoice
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Skip $0 invoices (e.g. free-trial start)
  if (!invoice.amount_paid || invoice.amount_paid === 0) return;

  const stripeCustomerId = invoice.customer as string;
  const sponsor = await prisma.sponsor.findUnique({
    where: { stripeCustomerId },
    select: { id: true, businessName: true, contactEmail: true },
  });

  if (!sponsor) {
    logger.warn({ stripeCustomerId, invoiceId: invoice.id }, 'No sponsor for invoice.paid');
    return;
  }

  // Idempotent — skip if payment already recorded for this invoice
  const existing = await prisma.payment.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });
  if (existing) return;

  // In Stripe SDK v20, the subscription ID lives in invoice.parent.subscription_details.subscription
  const subRef = invoice.parent?.subscription_details?.subscription;
  const stripeSubId = !subRef ? null : typeof subRef === 'string' ? subRef : subRef.id;

  // Use invoice.id as the payment reference (payment_intent is no longer a top-level invoice field in v20)
  const piId = invoice.id;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        paymentType: 'SPONSOR_FEE',
        payerType: 'SPONSOR',
        payerId: sponsor.id,
        amountCents: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        stripePaymentId: piId,
        stripeInvoiceId: invoice.id,
        status: 'COMPLETED',
        description: `Monthly platform fee — ${sponsor.businessName}`,
      },
    });

    // Update subscription's real billing period from invoice dates
    if (stripeSubId) {
      await tx.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: {
          currentPeriodStart: new Date(invoice.period_start * 1000),
          currentPeriodEnd: new Date(invoice.period_end * 1000),
          status: 'ACTIVE',
        },
      });
    }
  });

  // Send receipt email if contact email is available
  if (sponsor.contactEmail) {
    const amount = `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`;
    await enqueueEmail({
      to: sponsor.contactEmail,
      subject: `Treasure Hunt invoice paid — ${amount}`,
      type: 'payment_receipt',
      payload: {
        huntTitle: 'Sponsor Platform Fee',
        amount,
        paymentId: invoice.id,
      },
    }).catch((err: unknown) => logger.error({ err }, 'Failed to enqueue invoice receipt email'));
  }

  logger.info({ sponsorId: sponsor.id, invoiceId: invoice.id }, 'Sponsor invoice recorded');
}

// Send a payment failure notification email when a sponsor invoice cannot be collected
async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  const sponsor = await prisma.sponsor.findUnique({
    where: { stripeCustomerId },
    select: { id: true, businessName: true, contactEmail: true },
  });

  if (!sponsor?.contactEmail) return;

  const amount = `${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`;

  await enqueueEmail({
    to: sponsor.contactEmail,
    subject: `Action required: Treasure Hunt payment failed`,
    type: 'payment_receipt', // Reuses receipt template — worker can branch on payload
    payload: {
      huntTitle: 'Sponsor Platform Fee — Payment Failed',
      amount,
      paymentId: invoice.id,
    },
  }).catch((err: unknown) => logger.error({ err }, 'Failed to enqueue invoice failure email'));

  logger.warn({ sponsorId: sponsor.id, invoiceId: invoice.id }, 'Sponsor invoice payment failed');
}

export default router;
