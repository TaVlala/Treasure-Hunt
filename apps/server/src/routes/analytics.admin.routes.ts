// Admin analytics endpoints — aggregated event stats for the admin dashboard.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/analytics (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import type { ApiSuccess } from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventCountByType {
  eventType: string;
  count: number;
}

interface DailyTrend {
  date: string; // ISO date string "YYYY-MM-DD"
  count: number;
}

interface OverallStats {
  totalEvents: number;
  byType: EventCountByType[];
  last7DaysTrend: DailyTrend[];
  recentEvents: RecentEvent[];
}

interface RecentEvent {
  id: string;
  eventType: string;
  huntId: string | null;
  playerId: string | null;
  createdAt: string;
}

interface ClueFunnelEntry {
  clueId: string;
  clueTitle: string;
  orderIndex: number;
  foundCount: number;
}

interface HuntAnalytics {
  huntId: string;
  totalClueFoundEvents: number;
  totalHuntCompleteEvents: number;
  averageScore: number | null;
  clueFunnel: ClueFunnelEntry[];
}

// ---------------------------------------------------------------------------
// GET / — overall stats: event counts by type + last-7-days daily trend
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Count all events grouped by eventType
    const grouped = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const byType: EventCountByType[] = grouped.map((g) => ({
      eventType: g.eventType,
      count: g._count.id,
    }));

    const totalEvents = byType.reduce((sum, e) => sum + e.count, 0);

    // Last 7 days trend — one row per day; use raw SQL for date truncation
    type TrendRow = { day: Date; count: bigint };
    const trendRows = await prisma.$queryRaw<TrendRow[]>`
      SELECT
        date_trunc('day', created_at AT TIME ZONE 'UTC') AS day,
        COUNT(*)::bigint AS count
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC
    `;

    const last7DaysTrend: DailyTrend[] = trendRows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));

    // Fetch last 50 events for the recent-events table on the admin page
    const rawEvents = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        eventType: true,
        huntId: true,
        playerId: true,
        createdAt: true,
      },
    });

    const recentEvents: RecentEvent[] = rawEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      huntId: e.huntId,
      playerId: e.playerId,
      createdAt: e.createdAt.toISOString(),
    }));

    const data: OverallStats = {
      totalEvents,
      byType,
      last7DaysTrend,
      recentEvents,
    };

    const response: ApiSuccess<OverallStats> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /hunts/:huntId — per-hunt analytics: clue funnel, completion stats
// ---------------------------------------------------------------------------

router.get('/hunts/:huntId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;

    // Total CLUE_FOUND events for this hunt
    const totalClueFoundEvents = await prisma.analyticsEvent.count({
      where: { huntId, eventType: 'CLUE_FOUND' },
    });

    // Total HUNT_COMPLETE events for this hunt
    const totalHuntCompleteEvents = await prisma.analyticsEvent.count({
      where: { huntId, eventType: 'HUNT_COMPLETE' },
    });

    // Average score from HUNT_COMPLETE metadata
    type ScoreRow = { avg_score: number | null };
    const scoreRows = await prisma.$queryRaw<ScoreRow[]>`
      SELECT AVG((metadata->>'score')::numeric) AS avg_score
      FROM analytics_events
      WHERE hunt_id = ${huntId}::uuid
        AND event_type = 'HUNT_COMPLETE'
        AND metadata->>'score' IS NOT NULL
    `;
    const averageScore =
      scoreRows[0]?.avg_score != null ? Math.round(Number(scoreRows[0].avg_score)) : null;

    // Clue funnel: count CLUE_FOUND events per clue, joined with clue metadata
    const clues = await prisma.clue.findMany({
      where: { huntId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, orderIndex: true },
    });

    // Count CLUE_FOUND analytics events per clueId for this hunt
    const clueFoundGroups = await prisma.analyticsEvent.groupBy({
      by: ['clueId'],
      where: { huntId, eventType: 'CLUE_FOUND', clueId: { not: null } },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const g of clueFoundGroups) {
      if (g.clueId) {
        countMap.set(g.clueId, g._count.id);
      }
    }

    const clueFunnel: ClueFunnelEntry[] = clues.map((c) => ({
      clueId: c.id,
      clueTitle: c.title,
      orderIndex: c.orderIndex,
      foundCount: countMap.get(c.id) ?? 0,
    }));

    const data: HuntAnalytics = {
      huntId,
      totalClueFoundEvents,
      totalHuntCompleteEvents,
      averageScore,
      clueFunnel,
    };

    const response: ApiSuccess<HuntAnalytics> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sponsors/:sponsorId — per-sponsor analytics: clue visits + prize stats
// ---------------------------------------------------------------------------

interface SponsorClueFunnelEntry {
  clueId: string;
  clueTitle: string;
  foundCount: number;
}

interface SponsorAnalytics {
  sponsorId: string;
  businessName: string;
  totalClueVisits: number;
  clueFunnel: SponsorClueFunnelEntry[];
  activePrizes: number;
  totalRedemptions: number;
  redemptionRate: number;
}

router.get('/sponsors/:sponsorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsorId = req.params['sponsorId'] as string;

    // Verify sponsor exists and grab businessName
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: { id: true, businessName: true },
    });

    if (!sponsor) {
      throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
    }

    // Fetch all SponsorClue records for this sponsor (includes clue title)
    const sponsorClues = await prisma.sponsorClue.findMany({
      where: { sponsorId },
      include: { clue: { select: { id: true, title: true } } },
    });

    const clueIds = sponsorClues.map((sc) => sc.clueId);

    // Count CLUE_FOUND events per clue for this sponsor's clues
    const clueFoundGroups =
      clueIds.length > 0
        ? await prisma.analyticsEvent.groupBy({
            by: ['clueId'],
            where: { eventType: 'CLUE_FOUND', clueId: { in: clueIds } },
            _count: { id: true },
          })
        : [];

    const countMap = new Map<string, number>();
    for (const g of clueFoundGroups) {
      if (g.clueId) {
        countMap.set(g.clueId, g._count.id);
      }
    }

    const clueFunnel: SponsorClueFunnelEntry[] = sponsorClues
      .map((sc) => ({
        clueId: sc.clueId,
        clueTitle: sc.clue.title,
        foundCount: countMap.get(sc.clueId) ?? 0,
      }))
      .sort((a, b) => b.foundCount - a.foundCount);

    const totalClueVisits = clueFunnel.reduce((sum, c) => sum + c.foundCount, 0);

    // Count active prizes (no expiry date or expiry in the future)
    const activePrizes = await prisma.sponsorPrize.count({
      where: {
        sponsorId,
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
    });

    // Sum redemptionsUsed across all prizes for this sponsor
    const redemptionAgg = await prisma.sponsorPrize.aggregate({
      where: { sponsorId },
      _sum: { redemptionsUsed: true },
    });

    const totalRedemptions = redemptionAgg._sum.redemptionsUsed ?? 0;

    // Redemption rate: safe division by zero
    const redemptionRate = totalClueVisits > 0 ? totalRedemptions / totalClueVisits : 0;

    const data: SponsorAnalytics = {
      sponsorId,
      businessName: sponsor.businessName,
      totalClueVisits,
      clueFunnel,
      activePrizes,
      totalRedemptions,
      redemptionRate,
    };

    const response: ApiSuccess<SponsorAnalytics> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /revenue — revenue summary: totals + monthly breakdown + recent payments
// ---------------------------------------------------------------------------

interface MonthlyRevenueEntry {
  month: string; // "YYYY-MM"
  amountCents: number;
  count: number;
}

interface RecentPayment {
  id: string;
  paymentType: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface RevenueSummary {
  totalRevenueCents: number;
  ticketRevenueCents: number;
  sponsorRevenueCents: number;
  monthlyBreakdown: MonthlyRevenueEntry[];
  recentPayments: RecentPayment[];
}

router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Aggregate totals for all COMPLETED payments
    const [totalAgg, ticketAgg, sponsorAgg] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', paymentType: 'TICKET_PURCHASE' },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', paymentType: 'SPONSOR_FEE' },
        _sum: { amountCents: true },
      }),
    ]);

    const totalRevenueCents = totalAgg._sum.amountCents ?? 0;
    const ticketRevenueCents = ticketAgg._sum.amountCents ?? 0;
    const sponsorRevenueCents = sponsorAgg._sum.amountCents ?? 0;

    // Monthly breakdown via raw SQL (last 12 months)
    type MonthRow = { month: Date; amount: bigint; count: bigint };
    const monthRows = await prisma.$queryRaw<MonthRow[]>`
      SELECT
        DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') AS month,
        SUM(amount_cents)::bigint AS amount,
        COUNT(*)::bigint AS count
      FROM payments
      WHERE status = 'COMPLETED'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month DESC
    `;

    const monthlyBreakdown: MonthlyRevenueEntry[] = monthRows.map((r) => ({
      month: r.month.toISOString().slice(0, 7), // "YYYY-MM"
      amountCents: Number(r.amount),
      count: Number(r.count),
    }));

    // Last 20 payments (any status) for the recent payments table
    const rawPayments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        paymentType: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    const recentPayments: RecentPayment[] = rawPayments.map((p) => ({
      id: p.id,
      paymentType: p.paymentType,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    const data: RevenueSummary = {
      totalRevenueCents,
      ticketRevenueCents,
      sponsorRevenueCents,
      monthlyBreakdown,
      recentPayments,
    };

    const response: ApiSuccess<RevenueSummary> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;

