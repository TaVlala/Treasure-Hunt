// Player-facing game endpoints — GPS proximity check + game session management.
// All routes require a valid JWT (any role — players and admins).
// Base path: /api/v1/game (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authenticate';
import { proximityCheckSchema, joinHuntSchema } from '../schemas/game.schemas';
import type {
  ApiSuccess,
  ProximityCheckResult,
  GameSession,
  JoinHuntResult,
  Clue,
  SessionStatus,
} from '@treasure-hunt/shared';

const router = Router();

// All game routes require a valid JWT (player or admin)
router.use(authenticate);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PrismaDecimal = { toNumber(): number };

// Haversine great-circle distance in metres — fallback when PostGIS location is NULL
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Maps a Prisma GameSession row to the shared GameSession shape
type SessionRow = {
  id: string;
  huntId: string;
  playerId: string;
  teamId: string | null;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  cluesFound: number;
  totalClues: number;
  timeTakenSecs: number | null;
};

function toSessionResponse(s: SessionRow): GameSession {
  return {
    id: s.id,
    huntId: s.huntId,
    playerId: s.playerId,
    teamId: s.teamId,
    status: s.status.toLowerCase() as SessionStatus,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    score: s.score,
    cluesFound: s.cluesFound,
    totalClues: s.totalClues,
    timeTakenSecs: s.timeTakenSecs,
  };
}

// Maps a Prisma Clue row to the player-safe shared Clue shape
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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /proximity-check — returns distance to a clue and whether the player is within range.
// Does NOT unlock the clue — that happens in the game-session submit flow (future chunk).
router.post('/proximity-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clueId, latitude, longitude } = proximityCheckSchema.parse(req.body);

    // Validate clue exists and fetch stored lat/lng + radius for fallback
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        proximityRadiusMeters: true,
      },
    });

    if (!clue) {
      throw new AppError('Clue not found', 404, 'NOT_FOUND');
    }

    const radiusMeters = clue.proximityRadiusMeters;

    // PostGIS proximity query — returns null columns if location was never set
    type ProximityRow = { distance_meters: number | null; within_range: boolean | null };

    const rows = await prisma.$queryRaw<ProximityRow[]>`
      SELECT
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) AS distance_meters,
        ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}::float8
        ) AS within_range
      FROM clues
      WHERE id = ${clueId}::uuid
    `;

    let distanceMeters: number;
    let withinRange: boolean;

    const row = rows[0];
    if (row && row.distance_meters !== null && row.within_range !== null) {
      // PostGIS result available
      distanceMeters = row.distance_meters;
      withinRange = row.within_range;
    } else {
      // Fallback: Haversine using stored lat/lng (location column not yet set)
      const clueDecimal = clue as typeof clue & { latitude: PrismaDecimal; longitude: PrismaDecimal };
      distanceMeters = haversineMeters(
        latitude,
        longitude,
        clueDecimal.latitude.toNumber(),
        clueDecimal.longitude.toNumber(),
      );
      withinRange = distanceMeters <= radiusMeters;
    }

    const response: ApiSuccess<ProximityCheckResult> = {
      success: true,
      data: {
        withinRange,
        distanceMeters: Math.round(distanceMeters),
        radiusMeters,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /sessions — join (start) a hunt. Creates a GameSession + PlayerProgress rows.
// Returns the new session and the first unlocked clue.
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { huntId } = joinHuntSchema.parse(req.body);
    const playerId = req.user!.id;

    // Hunt must exist and be ACTIVE
    const hunt = await prisma.hunt.findUnique({
      where: { id: huntId },
      select: { id: true, status: true },
    });
    if (!hunt) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }
    if (hunt.status !== 'ACTIVE') {
      throw new AppError('Hunt is not currently active', 409, 'HUNT_NOT_ACTIVE');
    }

    // Prevent duplicate active sessions for the same player + hunt
    const existing = await prisma.gameSession.findUnique({
      where: { huntId_playerId: { huntId, playerId } },
    });
    if (existing) {
      throw new AppError('You have already joined this hunt', 409, 'ALREADY_JOINED');
    }

    // Load all clues ordered so we can set first one UNLOCKED
    const clues = await prisma.clue.findMany({
      where: { huntId },
      orderBy: { orderIndex: 'asc' },
    });
    if (clues.length === 0) {
      throw new AppError('This hunt has no clues yet', 409, 'NO_CLUES');
    }

    // Create session + all progress records atomically
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.gameSession.create({
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
          sessionId: newSession.id,
          clueId: clue.id,
          status: i === 0 ? ('UNLOCKED' as const) : ('LOCKED' as const),
          pointsEarned: 0,
          hintUsed: false,
        })),
      });

      return newSession;
    });

    const firstClue = clues[0]!;

    const response: ApiSuccess<JoinHuntResult> = {
      success: true,
      message: 'Hunt joined',
      data: {
        session: toSessionResponse(session),
        currentClue: toClueResponse(firstClue as ClueRow),
      },
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
