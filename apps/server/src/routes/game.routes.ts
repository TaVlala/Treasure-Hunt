// Player-facing game endpoints — GPS proximity check.
// All routes require a valid JWT (any role — players and admins).
// Base path: /api/v1/game (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authenticate';
import { proximityCheckSchema } from '../schemas/game.schemas';
import type { ApiSuccess, ProximityCheckResult } from '@treasure-hunt/shared';

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

export default router;
