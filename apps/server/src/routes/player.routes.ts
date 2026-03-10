// Player-facing hunt discovery endpoints — returns public hunt data to authenticated players.
// All routes require a valid player JWT (via authenticate middleware).
// Base path: /api/v1/player (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import type {
  ApiSuccess,
  Hunt,
  HuntDetail,
  HuntDifficulty,
  HuntTheme,
  HuntType,
  TeamMode,
  HuntStatus,
  PaginatedData,
} from '@treasure-hunt/shared';

const router = Router();

// All player routes require a valid JWT
router.use(authenticate);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PrismaDecimal = { toNumber(): number };

type HuntRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  city: string;
  region: string | null;
  difficulty: string;
  theme: string;
  huntType: string;
  ticketPriceCents: number | null;
  currency: string;
  timeLimitMinutes: number | null;
  maxPlayers: number | null;
  teamMode: string;
  maxTeamSize: number;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  centerLat: PrismaDecimal;
  centerLng: PrismaDecimal;
  zoomLevel: number;
  whitelabelName: string | null;
  whitelabelLogoUrl: string | null;
  whitelabelColor: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
};

// Converts a Prisma hunt row to the shared Hunt API response shape
function toHuntResponse(hunt: HuntRow): Hunt {
  return {
    id: hunt.id,
    title: hunt.title,
    slug: hunt.slug,
    description: hunt.description,
    city: hunt.city,
    region: hunt.region,
    difficulty: hunt.difficulty.toLowerCase() as HuntDifficulty,
    theme: hunt.theme.toLowerCase() as HuntTheme,
    huntType: hunt.huntType.toLowerCase() as HuntType,
    ticketPriceCents: hunt.ticketPriceCents,
    currency: hunt.currency,
    timeLimitMinutes: hunt.timeLimitMinutes,
    maxPlayers: hunt.maxPlayers,
    teamMode: hunt.teamMode.toLowerCase() as TeamMode,
    maxTeamSize: hunt.maxTeamSize,
    status: hunt.status.toLowerCase() as HuntStatus,
    startsAt: hunt.startsAt?.toISOString() ?? null,
    endsAt: hunt.endsAt?.toISOString() ?? null,
    thumbnailUrl: hunt.thumbnailUrl,
    coverImageUrl: hunt.coverImageUrl,
    centerLat: hunt.centerLat.toNumber(),
    centerLng: hunt.centerLng.toNumber(),
    zoomLevel: hunt.zoomLevel,
    whitelabelName: hunt.whitelabelName,
    whitelabelLogoUrl: hunt.whitelabelLogoUrl,
    whitelabelColor: hunt.whitelabelColor,
    metaTitle: hunt.metaTitle,
    metaDescription: hunt.metaDescription,
    createdAt: hunt.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /hunts — list all ACTIVE hunts, with clue count and optional city filter.
// Players can only see ACTIVE hunts (not DRAFT / PAUSED / ARCHIVED).
router.get('/hunts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = typeof req.query['city'] === 'string' ? req.query['city'] : undefined;
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query['pageSize'] ?? '20'), 10)));

    const where = {
      status: 'ACTIVE' as const,
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
    };

    const [total, hunts] = await Promise.all([
      prisma.hunt.count({ where }),
      prisma.hunt.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { clues: true } } },
      }),
    ]);

    // Attach clueCount as a HuntDetail-compatible shape but typed as Hunt + clueCount
    const items = hunts.map((h) => ({
      ...toHuntResponse(h),
      clueCount: h._count.clues,
    }));

    const response: ApiSuccess<PaginatedData<Hunt & { clueCount: number }>> = {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /hunts/:id — fetch a single ACTIVE hunt by ID with clue count.
// Returns 404 if the hunt does not exist or is not ACTIVE.
router.get('/hunts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const hunt = await prisma.hunt.findUnique({
      where: { id },
      include: { _count: { select: { clues: true } } },
    });

    if (!hunt) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }
    if (hunt.status !== 'ACTIVE') {
      throw new AppError('Hunt is not currently active', 404, 'NOT_FOUND');
    }

    const response: ApiSuccess<HuntDetail & { clueCount: number }> = {
      success: true,
      data: {
        ...toHuntResponse(hunt),
        clueCount: hunt._count.clues,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
