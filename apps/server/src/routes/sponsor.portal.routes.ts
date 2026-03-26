// Sponsor self-serve portal API routes.
// All routes require SPONSOR role JWT.
// Sponsors can only access data linked to their own Sponsor record.

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';

const router = Router();

// Apply authentication + SPONSOR role guard to every route in this file
router.use(authenticate, requireRole('sponsor'));

// --- GET /me ---
// Returns the sponsor profile linked to the authenticated user, plus quick stats.
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsor = await prisma.sponsor.findUnique({
      where: { userId: req.user!.id },
      include: {
        _count: {
          select: {
            sponsorClues: true,
            sponsorPrizes: true,
          },
        },
      },
    });

    if (!sponsor) {
      throw new AppError('Sponsor profile not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: sponsor.id,
        businessName: sponsor.businessName,
        contactName: sponsor.contactName,
        contactEmail: sponsor.contactEmail,
        contactPhone: sponsor.contactPhone,
        websiteUrl: sponsor.websiteUrl,
        logoUrl: sponsor.logoUrl,
        description: sponsor.description,
        address: sponsor.address,
        latitude: sponsor.latitude,
        longitude: sponsor.longitude,
        tier: sponsor.tier,
        status: sponsor.status,
        contractStart: sponsor.contractStart,
        contractEnd: sponsor.contractEnd,
        monthlyFeeCents: sponsor.monthlyFeeCents,
        createdAt: sponsor.createdAt,
        updatedAt: sponsor.updatedAt,
        clueCount: sponsor._count.sponsorClues,
        prizeCount: sponsor._count.sponsorPrizes,
      },
    });
  } catch (e) { next(e); }
});

// --- GET /clues ---
// Returns all clues this sponsor is linked to via SponsorClue, with hunt context and visit counts.
router.get('/clues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsor = await prisma.sponsor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!sponsor) throw new AppError('Sponsor profile not found', 404, 'NOT_FOUND');

    const sponsorClues = await prisma.sponsorClue.findMany({
      where: { sponsorId: sponsor.id },
      include: {
        clue: {
          include: {
            hunt: { select: { title: true, status: true } },
          },
        },
      },
    });

    // Aggregate CLUE_FOUND event counts for each clue in parallel
    const visitCounts = await Promise.all(
      sponsorClues.map((sc) =>
        prisma.analyticsEvent.count({
          where: { clueId: sc.clueId, eventType: 'CLUE_FOUND' },
        }),
      ),
    );

    const data = sponsorClues.map((sc, i) => ({
      clueId: sc.clueId,
      clueTitle: sc.clue.title,
      huntTitle: sc.clue.hunt.title,
      huntStatus: sc.clue.hunt.status,
      brandedMessage: sc.brandedMessage,
      offerText: sc.offerText,
      brandingColor: sc.brandingColor,
      callToAction: sc.callToAction,
      visitCount: visitCounts[i],
    }));

    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// --- GET /analytics ---
// Summary stats for this sponsor: total visits, redemptions, active clues, and billing info.
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsor = await prisma.sponsor.findUnique({
      where: { userId: req.user!.id },
      select: { id: true, tier: true, monthlyFeeCents: true, status: true },
    });
    if (!sponsor) throw new AppError('Sponsor profile not found', 404, 'NOT_FOUND');

    // Get all clue IDs linked to this sponsor
    const sponsorClues = await prisma.sponsorClue.findMany({
      where: { sponsorId: sponsor.id },
      select: { clueId: true },
    });
    const clueIds = sponsorClues.map((sc) => sc.clueId);

    // Get all prize IDs for this sponsor
    const sponsorPrizes = await prisma.sponsorPrize.findMany({
      where: { sponsorId: sponsor.id },
      select: { id: true },
    });
    const prizeIds = sponsorPrizes.map((sp) => sp.id);

    // Run all aggregates in parallel
    const [totalVisits, totalRedemptions] = await Promise.all([
      // Total CLUE_FOUND events across all sponsor clues
      clueIds.length > 0
        ? prisma.analyticsEvent.count({
            where: { clueId: { in: clueIds }, eventType: 'CLUE_FOUND' },
          })
        : Promise.resolve(0),
      // Total redemptions linked to sponsor prizes
      prizeIds.length > 0
        ? prisma.redemption.count({ where: { prizeId: { in: prizeIds } } })
        : Promise.resolve(0),
    ]);

    const result: {
      totalVisits: number;
      totalRedemptions: number;
      activeClues: number;
      monthlyFeeCents: number | null;
      tier: string;
    } = {
      totalVisits,
      totalRedemptions,
      activeClues: clueIds.length,
      monthlyFeeCents: sponsor.monthlyFeeCents,
      tier: sponsor.tier,
    };

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// --- GET /subscription ---
// Returns the sponsor's current Stripe subscription status and billing period.
// Used by the portal dashboard to show subscription state and CTA buttons.
router.get('/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsor = await prisma.sponsor.findUnique({
      where: { userId: req.user!.id },
      select: {
        id: true,
        monthlyFeeCents: true,
        stripeCustomerId: true,
        subscription: {
          select: {
            id: true,
            status: true,
            stripeSubscriptionId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!sponsor) throw new AppError('Sponsor profile not found', 404, 'NOT_FOUND');

    const data = sponsor.subscription
      ? {
          hasSubscription: true,
          monthlyFeeCents: sponsor.monthlyFeeCents,
          hasBillingAccount: !!sponsor.stripeCustomerId,
          subscription: {
            id: sponsor.subscription.id,
            status: sponsor.subscription.status.toLowerCase(),
            stripeSubscriptionId: sponsor.subscription.stripeSubscriptionId,
            currentPeriodStart: sponsor.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: sponsor.subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: sponsor.subscription.cancelAtPeriodEnd,
            createdAt: sponsor.subscription.createdAt.toISOString(),
            updatedAt: sponsor.subscription.updatedAt.toISOString(),
          },
        }
      : {
          hasSubscription: false,
          monthlyFeeCents: sponsor.monthlyFeeCents,
          hasBillingAccount: !!sponsor.stripeCustomerId,
          subscription: null,
        };

    res.json({ success: true, data });
  } catch (e) { next(e); }
});

export default router;
