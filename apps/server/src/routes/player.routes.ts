// Player-facing hunt discovery endpoints — returns public hunt data to authenticated players.
// All routes require a valid player JWT (via authenticate middleware).
// Base path: /api/v1/player (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import type {
  ApiSuccess,
  Hunt,
  HuntDetail,
  Clue,
  ClueWithSponsor,
  ClueSponsor,
  HuntDifficulty,
  HuntTheme,
  HuntType,
  TeamMode,
  HuntStatus,
  PaginatedData,
  SponsorPrize,
  PrizeType,
  Redemption,
  RedemptionStatus,
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

// Converts a Prisma clue row to the player-safe Clue shape (no answer field)
type ClueRow = {
  id: string;
  huntId: string;
  orderIndex: number;
  title: string;
  description: string;
  hintText: string | null;
  clueType: string;
  imageUrl: string | null;
  latitude: PrismaDecimal;
  longitude: PrismaDecimal;
  proximityRadiusMeters: number;
  isBonus: boolean;
  points: number;
  unlockMessage: string | null;
  createdAt: Date;
};

function toClueResponse(c: ClueRow): Clue {
  return {
    id: c.id,
    huntId: c.huntId,
    orderIndex: c.orderIndex,
    title: c.title,
    description: c.description,
    hintText: c.hintText,
    clueType: c.clueType.toLowerCase() as Clue['clueType'],
    imageUrl: c.imageUrl,
    latitude: c.latitude.toNumber(),
    longitude: c.longitude.toNumber(),
    proximityRadiusMeters: c.proximityRadiusMeters,
    isBonus: c.isBonus,
    points: c.points,
    unlockMessage: c.unlockMessage,
    createdAt: c.createdAt.toISOString(),
  };
}

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

// GET /hunts/:huntId/my-session — returns the player's active session for a hunt, or 404.
// Used by the detail screen to detect an in-progress hunt and show "Resume" instead of "Join".
router.get('/hunts/:huntId/my-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const playerId = req.user!.id;

    const session = await prisma.gameSession.findUnique({
      where: { huntId_playerId: { huntId, playerId } },
      include: { progress: true },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new AppError('No active session', 404, 'NOT_FOUND');
    }

    const progressList = session.progress.map((p) => ({
      clueId: p.clueId,
      status: p.status.toLowerCase(),
      foundAt: p.foundAt ? p.foundAt.toISOString() : null,
      pointsEarned: p.pointsEarned,
      hintUsed: p.hintUsed,
    }));

    const data = {
      id: session.id,
      huntId: session.huntId,
      playerId: session.playerId,
      teamId: session.teamId,
      status: session.status.toLowerCase(),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      score: session.score,
      cluesFound: session.cluesFound,
      totalClues: session.totalClues,
      timeTakenSecs: session.timeTakenSecs,
      progress: progressList,
    };

    const response: ApiSuccess<typeof data> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /hunts/:huntId/clues/:clueId — fetch a single clue by ID for an active hunt.
// The player must have this clue in an active session (validated via session lookup).
// Returns player-safe clue shape — no answer field.
router.get('/hunts/:huntId/clues/:clueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const clueId = req.params['clueId'] as string;
    const playerId = req.user!.id;

    // Clue must exist and belong to an active hunt
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
      select: {
        id: true,
        huntId: true,
        orderIndex: true,
        title: true,
        description: true,
        hintText: true,
        clueType: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        proximityRadiusMeters: true,
        isBonus: true,
        points: true,
        unlockMessage: true,
        createdAt: true,
        hunt: { select: { status: true } },
        sponsorClue: {
          select: {
            brandedMessage: true,
            offerText: true,
            brandingColor: true,
            callToAction: true,
            sponsor: {
              select: { businessName: true, logoUrl: true, websiteUrl: true },
            },
          },
        },
      },
    });

    if (!clue || clue.huntId !== huntId) {
      throw new AppError('Clue not found', 404, 'NOT_FOUND');
    }
    if (clue.hunt.status !== 'ACTIVE') {
      throw new AppError('Hunt is not active', 404, 'NOT_FOUND');
    }

    // Verify the player has an active session for this hunt
    const session = await prisma.gameSession.findUnique({
      where: { huntId_playerId: { huntId, playerId } },
      select: { id: true, status: true },
    });
    if (!session || session.status !== 'ACTIVE') {
      throw new AppError('No active session for this hunt', 403, 'FORBIDDEN');
    }

    // Build optional sponsor branding data
    const sc = clue.sponsorClue;
    const sponsor: ClueSponsor | null = sc
      ? {
          businessName: sc.sponsor.businessName,
          logoUrl: sc.sponsor.logoUrl,
          websiteUrl: sc.sponsor.websiteUrl,
          brandedMessage: sc.brandedMessage,
          offerText: sc.offerText,
          brandingColor: sc.brandingColor,
          callToAction: sc.callToAction,
        }
      : null;

    const response: ApiSuccess<ClueWithSponsor> = {
      success: true,
      data: { ...toClueResponse(clue as ClueRow), sponsor },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /hunts/:huntId/prizes — returns prizes the player has earned in a completed session.
// Requires sessionId query param to look up how many clues the player found.
// Only returns prizes where minCluesFound <= session.cluesFound.
router.get('/hunts/:huntId/prizes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const playerId = req.user!.id;
    const sessionId = typeof req.query['sessionId'] === 'string' ? req.query['sessionId'] : undefined;

    if (!sessionId) {
      throw new AppError('sessionId query param is required', 400, 'BAD_REQUEST');
    }

    // Fetch the session — must belong to this player and hunt, and be completed
    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, huntId, playerId },
      select: { cluesFound: true, status: true },
    });

    if (!session) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }
    if (session.status !== 'COMPLETED') {
      throw new AppError('Hunt session is not completed', 400, 'BAD_REQUEST');
    }

    // Return prizes the player qualifies for (minCluesFound threshold met)
    const prizes = await prisma.sponsorPrize.findMany({
      where: {
        huntId,
        minCluesFound: { lte: session.cluesFound },
      },
      orderBy: [{ isGrandPrize: 'desc' }, { minCluesFound: 'desc' }],
      select: {
        id: true,
        huntId: true,
        title: true,
        description: true,
        prizeType: true,
        valueDescription: true,
        expiryDate: true,
        termsConditions: true,
        imageUrl: true,
        isGrandPrize: true,
        minCluesFound: true,
        sponsor: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
            address: true,
            websiteUrl: true,
          },
        },
      },
    });

    // Map Prisma rows to the shared SponsorPrize shape
    const data: SponsorPrize[] = prizes.map((p) => ({
      id: p.id,
      huntId: p.huntId,
      title: p.title,
      description: p.description,
      prizeType: p.prizeType.toLowerCase() as PrizeType,
      valueDescription: p.valueDescription,
      expiryDate: p.expiryDate ? p.expiryDate.toISOString().split('T')[0]! : null,
      termsConditions: p.termsConditions,
      imageUrl: p.imageUrl,
      isGrandPrize: p.isGrandPrize,
      minCluesFound: p.minCluesFound,
      sponsor: {
        id: p.sponsor.id,
        businessName: p.sponsor.businessName,
        logoUrl: p.sponsor.logoUrl,
        address: p.sponsor.address,
        websiteUrl: p.sponsor.websiteUrl,
      },
    }));

    const response: ApiSuccess<SponsorPrize[]> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// Request body schema for prize redemption
const redeemBody = z.object({ sessionId: z.string().uuid() });

// POST /prizes/:prizeId/redeem — generate (or return existing) redemption QR for a prize.
// Idempotent per player+prize: calling twice returns the same Redemption record.
// Validates that the player's session is complete and they met the minCluesFound threshold.
router.post('/prizes/:prizeId/redeem', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prizeId = req.params['prizeId'] as string;
    const playerId = req.user!.id;

    const parsed = redeemBody.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('sessionId (UUID) is required in request body', 400, 'BAD_REQUEST');
    }
    const { sessionId } = parsed.data;

    // Load prize with its hunt so we can validate session ownership
    const prize = await prisma.sponsorPrize.findUnique({
      where: { id: prizeId },
      select: {
        id: true,
        huntId: true,
        minCluesFound: true,
        redemptionLimit: true,
        redemptionsUsed: true,
      },
    });
    if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');

    // Validate session belongs to this player, matches the hunt, and is completed
    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, huntId: prize.huntId, playerId },
      select: { cluesFound: true, status: true },
    });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.status !== 'COMPLETED') {
      throw new AppError('Hunt session is not completed', 400, 'BAD_REQUEST');
    }
    if (session.cluesFound < prize.minCluesFound) {
      throw new AppError('Not enough clues found to earn this prize', 403, 'FORBIDDEN');
    }

    // Return existing redemption if this player already claimed this prize
    const existing = await prisma.redemption.findFirst({
      where: { prizeId, playerId },
    });
    if (existing) {
      const data: Redemption = {
        id: existing.id,
        prizeId: existing.prizeId,
        playerId: existing.playerId,
        sessionId: existing.sessionId,
        qrCode: existing.qrCode,
        status: existing.status.toLowerCase() as RedemptionStatus,
        expiresAt: existing.expiresAt.toISOString(),
        createdAt: existing.createdAt.toISOString(),
      };
      res.status(200).json({ success: true, data } as ApiSuccess<Redemption>);
      return;
    }

    // Check redemption limit before creating a new record
    if (prize.redemptionLimit !== null && prize.redemptionsUsed >= prize.redemptionLimit) {
      throw new AppError('This prize has reached its redemption limit', 409, 'CONFLICT');
    }

    // Create redemption + increment counter atomically
    const EXPIRY_DAYS = 90;
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const qrCode = `TH-${crypto.randomUUID()}`;

    const [redemption] = await prisma.$transaction([
      prisma.redemption.create({
        data: { prizeId, playerId, sessionId, qrCode, expiresAt },
      }),
      prisma.sponsorPrize.update({
        where: { id: prizeId },
        data: { redemptionsUsed: { increment: 1 } },
      }),
    ]);

    const data: Redemption = {
      id: redemption.id,
      prizeId: redemption.prizeId,
      playerId: redemption.playerId,
      sessionId: redemption.sessionId,
      qrCode: redemption.qrCode,
      status: redemption.status.toLowerCase() as RedemptionStatus,
      expiresAt: redemption.expiresAt.toISOString(),
      createdAt: redemption.createdAt.toISOString(),
    };

    const response: ApiSuccess<Redemption> = { success: true, data };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /sessions — returns all game sessions for the authenticated player, newest first.
// Includes the hunt title and per-session stats. Rank is not stored on the session row,
// so it is always null in this response.
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.id;

    const sessions = await prisma.gameSession.findMany({
      where: { playerId },
      orderBy: { startedAt: 'desc' },
      include: {
        hunt: {
          select: { id: true, title: true },
        },
      },
    });

    const data = sessions.map((s) => ({
      id: s.id,
      huntId: s.huntId,
      huntTitle: s.hunt.title,
      status: s.status.toLowerCase(),
      score: s.score,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      cluesFound: s.cluesFound,
      totalClues: s.totalClues,
      timeTakenSecs: s.timeTakenSecs,
      rank: null as number | null,
    }));

    const response: ApiSuccess<typeof data> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// Request body schema for device token registration
const deviceTokenBody = z.object({
  token: z.string().min(1).max(500),
});

// POST /device-token — saves or updates the player's Expo push token.
// Called on app start and after login. Silently overwrites any previous token.
router.post('/device-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.id;

    const parsed = deviceTokenBody.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('token (string) is required in request body', 400, 'BAD_REQUEST');
    }
    const { token } = parsed.data;

    await prisma.user.update({
      where: { id: playerId },
      data: { pushToken: token },
    });

    const response: ApiSuccess<{ ok: boolean }> = { success: true, data: { ok: true } };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
