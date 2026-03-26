// Admin analytics endpoints — aggregated event stats for the admin dashboard.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/analytics (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
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

// ---------------------------------------------------------------------------
// GET /players/live — live player positions from active game sessions
// ---------------------------------------------------------------------------

type PrismaDecimal = { toNumber(): number };

interface LivePlayer {
  sessionId: string;
  playerId: string;
  playerName: string;
  huntId: string;
  huntTitle: string;
  cluesFound: number;
  totalClues: number;
  score: number;
  startedAt: string;
  lastLat: number | null;
  lastLng: number | null;
  lastSeenAt: string | null;
}

interface LivePlayersData {
  players: LivePlayer[];
  totalActive: number;
}

router.get('/players/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch all active game sessions with player and hunt info
    const sessions = await prisma.gameSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        player: { select: { id: true, displayName: true } },
        hunt: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // For each session, fetch the latest analytics event that has a GPS location — run in parallel
    const lastEvents = await Promise.all(
      sessions.map((session) =>
        prisma.analyticsEvent.findFirst({
          where: { sessionId: session.id, latitude: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { latitude: true, longitude: true, createdAt: true },
        }),
      ),
    );

    const players: LivePlayer[] = sessions.map((session, i) => {
      const lastEvent = lastEvents[i];
      const lat = lastEvent?.latitude as PrismaDecimal | null | undefined;
      const lng = lastEvent?.longitude as PrismaDecimal | null | undefined;

      return {
        sessionId: session.id,
        playerId: session.player.id,
        playerName: session.player.displayName,
        huntId: session.hunt.id,
        huntTitle: session.hunt.title,
        cluesFound: session.cluesFound,
        totalClues: session.totalClues,
        score: session.score,
        startedAt: session.startedAt.toISOString(),
        lastLat: lat != null ? lat.toNumber() : null,
        lastLng: lng != null ? lng.toNumber() : null,
        lastSeenAt: lastEvent?.createdAt ? lastEvent.createdAt.toISOString() : null,
      };
    });

    const data: LivePlayersData = { players, totalActive: players.length };
    const response: ApiSuccess<LivePlayersData> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /retention — weekly player cohort retention heatmap
// ---------------------------------------------------------------------------
// Returns up to 12 weekly cohorts. Each cohort row contains:
//   week: ISO string of cohort week start (Monday)
//   size: number of new players who first played in that week
//   retained: array of [week0%, week1%, week2%, ...] retention rates
//   weeks: array of week offsets (0 = cohort week, 1 = next week, etc.)
// ---------------------------------------------------------------------------

interface RetentionCohort {
  week: string;        // cohort week start (ISO Monday)
  size: number;        // players who first played this week
  rates: (number | null)[]; // retention % per subsequent week (null = future)
}

interface RetentionData {
  cohorts: RetentionCohort[];
  weekCount: number;   // number of weeks tracked (= max columns)
  avgWeek1Retention: number | null;  // avg % retained in week 1 across all cohorts
  avgWeek2Retention: number | null;
}

router.get('/retention', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Truncate each session's startedAt to its ISO week start (Monday 00:00 UTC)
    // Then find each player's earliest cohort week and which weeks they were active
    const rows = await prisma.$queryRaw<
      Array<{ cohort_week: Date; active_week: Date; player_id: string }>
    >`
      WITH player_weeks AS (
        SELECT
          gs.player_id,
          date_trunc('week', gs.started_at) AS session_week
        FROM game_sessions gs
        WHERE gs.started_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY gs.player_id, date_trunc('week', gs.started_at)
      ),
      player_cohorts AS (
        SELECT
          player_id,
          MIN(session_week) AS cohort_week
        FROM player_weeks
        GROUP BY player_id
      )
      SELECT
        pc.cohort_week,
        pw.session_week AS active_week,
        pw.player_id
      FROM player_cohorts pc
      JOIN player_weeks pw ON pw.player_id = pc.player_id
      ORDER BY pc.cohort_week, pw.session_week
    `;

    // Group by cohort week
    const cohortMap = new Map<string, { players: Set<string>; activeByOffset: Map<number, Set<string>> }>();

    for (const row of rows) {
      const cohortKey = row.cohort_week.toISOString();
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, { players: new Set(), activeByOffset: new Map() });
      }
      const cohort = cohortMap.get(cohortKey)!;
      cohort.players.add(row.player_id);

      // Calculate week offset (0 = cohort week, 1 = next week, ...)
      const offsetMs = row.active_week.getTime() - row.cohort_week.getTime();
      const offsetWeeks = Math.round(offsetMs / (7 * 24 * 60 * 60 * 1000));
      if (!cohort.activeByOffset.has(offsetWeeks)) {
        cohort.activeByOffset.set(offsetWeeks, new Set());
      }
      cohort.activeByOffset.get(offsetWeeks)!.add(row.player_id);
    }

    const now = new Date();
    const weekCount = 12;

    const cohorts: RetentionCohort[] = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => {
        const cohortStart = new Date(week);
        const rates: (number | null)[] = [];

        for (let offset = 0; offset < weekCount; offset++) {
          const weekStart = new Date(cohortStart.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
          // Mark future weeks as null
          if (weekStart > now) {
            rates.push(null);
            continue;
          }
          const activeSet = data.activeByOffset.get(offset);
          const pct = activeSet ? Math.round((activeSet.size / data.players.size) * 100) : 0;
          rates.push(pct);
        }

        return { week, size: data.players.size, rates };
      });

    // Compute average week-1 and week-2 retention across cohorts that have past data
    const week1Rates = cohorts.map((c) => c.rates[1]).filter((r): r is number => r !== null);
    const week2Rates = cohorts.map((c) => c.rates[2]).filter((r): r is number => r !== null);
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;

    const data: RetentionData = {
      cohorts,
      weekCount,
      avgWeek1Retention: avg(week1Rates),
      avgWeek2Retention: avg(week2Rates),
    };

    const response: ApiSuccess<RetentionData> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sponsors/:id/report.pdf — PDF analytics report for a single sponsor
// ---------------------------------------------------------------------------

router.get(
  '/sponsors/:id/report.pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sponsorId = req.params['id'] as string;

      // Verify sponsor exists
      const sponsor = await prisma.sponsor.findUnique({
        where: { id: sponsorId },
        select: {
          id: true,
          businessName: true,
          tier: true,
          status: true,
          contactName: true,
          contactEmail: true,
          monthlyFeeCents: true,
        },
      });

      if (!sponsor) {
        throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
      }

      // Fetch all SponsorClue records for this sponsor
      const sponsorClues = await prisma.sponsorClue.findMany({
        where: { sponsorId },
        include: { clue: { select: { id: true, title: true } } },
      });

      const clueIds = sponsorClues.map((sc) => sc.clueId);

      // Count CLUE_FOUND events per clue
      const clueFoundGroups =
        clueIds.length > 0
          ? await prisma.analyticsEvent.groupBy({
              by: ['clueId'],
              where: { eventType: 'CLUE_FOUND', clueId: { in: clueIds } },
              _count: { id: true },
            })
          : [];

      // Count unique visitors per clue (distinct playerId)
      type UniqueRow = { clue_id: string; unique_visitors: bigint };
      const uniqueRows: UniqueRow[] =
        clueIds.length > 0
          ? await prisma.$queryRaw<UniqueRow[]>`
              SELECT clue_id, COUNT(DISTINCT player_id)::bigint AS unique_visitors
              FROM analytics_events
              WHERE event_type = 'CLUE_FOUND'
                AND clue_id = ANY(${clueIds}::uuid[])
              GROUP BY clue_id
            `
          : [];

      const countMap = new Map<string, number>();
      for (const g of clueFoundGroups) {
        if (g.clueId) countMap.set(g.clueId, g._count.id);
      }
      const uniqueMap = new Map<string, number>();
      for (const r of uniqueRows) {
        uniqueMap.set(r.clue_id, Number(r.unique_visitors));
      }

      const totalClueVisits = [...countMap.values()].reduce((s, n) => s + n, 0);
      const totalUniqueVisitors = [...uniqueMap.values()].reduce((s, n) => s + n, 0);

      // Count active prizes
      const activePrizes = await prisma.sponsorPrize.count({
        where: {
          sponsorId,
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
      });

      // Sum redemptions used
      const redemptionAgg = await prisma.sponsorPrize.aggregate({
        where: { sponsorId },
        _sum: { redemptionsUsed: true },
      });
      const totalRedemptions = redemptionAgg._sum.redemptionsUsed ?? 0;

      // Estimated revenue: sum of completed SPONSOR_FEE payments for this sponsor
      const revenueAgg = await prisma.payment.aggregate({
        where: {
          paymentType: 'SPONSOR_FEE',
          payerType: 'SPONSOR',
          payerId: sponsorId,
          status: 'COMPLETED',
        },
        _sum: { amountCents: true },
      });
      const estimatedRevenueCents = revenueAgg._sum.amountCents ?? 0;
      const estimatedRevenueDollars = (estimatedRevenueCents / 100).toFixed(2);

      // Build clue funnel rows for the report
      const clueFunnel = sponsorClues
        .map((sc) => ({
          title: sc.clue.title,
          visits: countMap.get(sc.clueId) ?? 0,
          unique: uniqueMap.get(sc.clueId) ?? 0,
        }))
        .sort((a, b) => b.visits - a.visits);

      // -----------------------------------------------------------------------
      // Generate PDF with pdfkit
      // -----------------------------------------------------------------------

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sponsor-${sponsorId}-report.pdf"`,
      );

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // -- Palette --
      const COLOR_DARK = '#111827';
      const COLOR_ACCENT = '#F97316';
      const COLOR_MUTED = '#6B7280';
      const COLOR_BORDER = '#E5E7EB';

      // -- Header bar --
      doc.rect(0, 0, doc.page.width, 80).fill(COLOR_DARK);
      doc
        .fillColor('#FFFFFF')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Sponsor Analytics Report', 50, 25, { lineBreak: false });

      // -- Logo placeholder --
      const logoX = doc.page.width - 130;
      doc.rect(logoX, 14, 80, 50).fillAndStroke('#FFFFFF', COLOR_BORDER);
      doc.fillColor(COLOR_MUTED).fontSize(10).font('Helvetica').text('LOGO', logoX, 32, {
        width: 80,
        align: 'center',
        lineBreak: false,
      });

      // -- Sponsor name --
      doc.moveDown(2);
      doc
        .fillColor(COLOR_ACCENT)
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(sponsor.businessName, { align: 'left' });

      // Sub-details row
      doc
        .fillColor(COLOR_MUTED)
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Tier: ${sponsor.tier}  ·  Status: ${sponsor.status}` +
            (sponsor.contactName ? `  ·  Contact: ${sponsor.contactName}` : '') +
            (sponsor.contactEmail ? `  <${sponsor.contactEmail}>` : ''),
        );

      doc
        .fillColor(COLOR_MUTED)
        .fontSize(9)
        .text(`Generated: ${new Date().toISOString()}`);

      // Divider
      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();
      doc.moveDown(1);

      // -- Section helper --
      const sectionTitle = (title: string) => {
        doc
          .fillColor(COLOR_DARK)
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(title.toUpperCase());
        doc
          .moveTo(50, doc.y + 2)
          .lineTo(doc.page.width - 50, doc.y + 2)
          .strokeColor(COLOR_ACCENT)
          .lineWidth(2)
          .stroke();
        doc.moveDown(0.8);
      };

      // Stat row helper
      const statRow = (label: string, value: string | number) => {
        const y = doc.y;
        doc.fillColor(COLOR_MUTED).fontSize(10).font('Helvetica').text(label, 50, y, {
          continued: false,
          lineBreak: false,
          width: 250,
        });
        doc
          .fillColor(COLOR_DARK)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(String(value), 310, y, { lineBreak: false });
        doc.moveDown(0.6);
      };

      // -- Section: Clue Performance --
      sectionTitle('Clue Performance');
      statRow('Total Clue Visits', totalClueVisits);
      statRow('Unique Visitors', totalUniqueVisitors);
      statRow('Sponsored Clues', clueIds.length);
      doc.moveDown(0.5);

      // Clue funnel sub-table
      if (clueFunnel.length > 0) {
        doc.fillColor(COLOR_MUTED).fontSize(9).font('Helvetica').text('Clue Breakdown:');
        doc.moveDown(0.3);

        // Column headers
        const colY = doc.y;
        doc
          .fillColor(COLOR_MUTED)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('CLUE TITLE', 60, colY, { width: 240, lineBreak: false })
          .text('VISITS', 310, colY, { width: 80, lineBreak: false, align: 'right' })
          .text('UNIQUE', 400, colY, { width: 80, lineBreak: false, align: 'right' });
        doc.moveDown(0.4);

        for (const c of clueFunnel) {
          const rowY = doc.y;
          doc
            .fillColor(COLOR_DARK)
            .fontSize(9)
            .font('Helvetica')
            .text(c.title, 60, rowY, { width: 240, lineBreak: false })
            .fillColor(COLOR_MUTED)
            .text(String(c.visits), 310, rowY, { width: 80, lineBreak: false, align: 'right' })
            .text(String(c.unique), 400, rowY, { width: 80, lineBreak: false, align: 'right' });
          doc.moveDown(0.5);
        }
      }

      doc.moveDown(0.8);

      // -- Section: Prize Redemptions --
      sectionTitle('Prize Redemptions');
      statRow('Active Prizes', activePrizes);
      statRow('Total Redemptions', totalRedemptions);
      const redemptionRate =
        totalClueVisits > 0
          ? `${((totalRedemptions / totalClueVisits) * 100).toFixed(1)}%`
          : '0.0%';
      statRow('Redemption Rate', redemptionRate);
      doc.moveDown(0.8);

      // -- Section: Revenue --
      sectionTitle('Revenue');
      statRow('Estimated Revenue (completed payments)', `$${estimatedRevenueDollars}`);
      if (sponsor.monthlyFeeCents != null) {
        statRow(
          'Monthly Fee (contracted)',
          `$${(sponsor.monthlyFeeCents / 100).toFixed(2)}`,
        );
      }
      doc.moveDown(0.8);

      // -- Footer: page number --
      const footerY = doc.page.height - 40;
      doc
        .fillColor(COLOR_MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Page 1  ·  Treasure Hunt Platform  ·  Confidential`,
          50,
          footerY,
          { align: 'center', width: doc.page.width - 100 },
        );

      doc.end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;


