// Admin analytics endpoints — aggregated event stats for the admin dashboard.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/analytics (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
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

export default router;
