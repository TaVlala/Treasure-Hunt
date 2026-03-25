// Stripe payment routes — ticket checkout + native PaymentSheet + webhook + redirect pages.
// Checkout:     POST /api/v1/stripe/checkout/:huntId      (browser Checkout Session — legacy)
// PaymentSheet: POST /api/v1/stripe/payment-sheet/:huntId (native Apple Pay / Google Pay)
// Webhook:      POST /api/v1/stripe/webhook               (raw body, mounted in index.ts)
// Pages:        GET  /api/v1/stripe/success|cancel        (HTML redirect targets for browser flow)

import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { enqueueEmail } from '../queues/index';
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
    if (event.type === 'checkout.session.completed') {
      // Browser Checkout flow — metadata lives on the Checkout Session
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
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

      // Enqueue payment receipt email (fire-and-forget)
      void sendPaymentReceiptEmail(huntId, playerId, stripePaymentId).catch((err: unknown) =>
        console.error('email enqueue error (checkout):', err),
      );

      res.status(200).json({ received: true, sessionId });
      return;
    }

    if (event.type === 'payment_intent.succeeded') {
      // Native PaymentSheet flow — metadata lives on the PaymentIntent
      const pi = event.data.object as Stripe.PaymentIntent;
      const huntId = pi.metadata['huntId'];
      const playerId = pi.metadata['playerId'];

      if (!huntId || !playerId) {
        // PaymentIntent not created by us (e.g. from browser checkout) — ignore
        res.status(200).json({ received: true });
        return;
      }

      const sessionId = await provisionHuntSession(
        huntId,
        playerId,
        pi.id,
        'Hunt ticket purchase via native PaymentSheet',
      );

      // Enqueue payment receipt email (fire-and-forget)
      void sendPaymentReceiptEmail(huntId, playerId, pi.id).catch((err: unknown) =>
        console.error('email enqueue error (payment_intent):', err),
      );

      res.status(200).json({ received: true, sessionId });
      return;
    }

    // Acknowledge all other event types
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
}

export default router;
