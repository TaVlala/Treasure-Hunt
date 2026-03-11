// Admin Clue CRUD endpoints — create, list, update, reorder, delete clues within a hunt.
// Nested under /api/v1/admin/hunts/:huntId/clues (registered in index.ts).
// Uses mergeParams: true so req.params.huntId is accessible from the parent path.
// All routes require a valid JWT + admin role.

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import {
  createClueSchema,
  updateClueSchema,
  reorderCluesSchema,
  type CreateClueBody,
  type UpdateClueBody,
} from '../schemas/clue.schemas';
import type { ApiSuccess, AdminClue, ClueType } from '@treasure-hunt/shared';

// mergeParams: true — inherit :huntId from the parent router mounted in index.ts
const router = Router({ mergeParams: true });

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Structural type matching Prisma Clue rows — avoids importing Prisma.Decimal directly
type PrismaDecimal = { toNumber(): number };

// sponsorId lives in the SponsorClue join table, not as a direct column on Clue.
// Queries that call toClueResponse must include: { sponsorClue: { select: { sponsorId: true } } }
type ClueRow = {
  id: string;
  huntId: string;
  orderIndex: number;
  title: string;
  description: string;
  hintText: string | null;
  clueType: string;
  answer: string | null;
  imageUrl: string | null;
  latitude: PrismaDecimal;
  longitude: PrismaDecimal;
  proximityRadiusMeters: number;
  isBonus: boolean;
  points: number;
  unlockMessage: string | null;
  sponsorClue: { sponsorId: string } | null;
  createdAt: Date;
};

// Converts a Prisma clue row to the shared AdminClue API response shape
function toClueResponse(clue: ClueRow): AdminClue {
  return {
    id: clue.id,
    huntId: clue.huntId,
    orderIndex: clue.orderIndex,
    title: clue.title,
    description: clue.description,
    hintText: clue.hintText,
    clueType: clue.clueType.toLowerCase() as ClueType,
    answer: clue.answer,
    imageUrl: clue.imageUrl,
    latitude: clue.latitude.toNumber(),
    longitude: clue.longitude.toNumber(),
    proximityRadiusMeters: clue.proximityRadiusMeters,
    isBonus: clue.isBonus,
    points: clue.points,
    unlockMessage: clue.unlockMessage,
    sponsorId: clue.sponsorClue?.sponsorId ?? null,
    createdAt: clue.createdAt.toISOString(),
  };
}

// Updates the PostGIS geography column after a lat/lng change.
// ST_MakePoint(longitude, latitude) — PostGIS uses (lng, lat) order.
async function setClueLocation(clueId: string, lat: number, lng: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE clues
    SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
    WHERE id = ${clueId}::uuid
  `;
}

// Verifies the hunt exists and returns a 404 if not.
// Called at the top of every handler to guard nested routes.
async function requireHunt(huntId: string): Promise<void> {
  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId },
    select: { id: true },
  });
  if (!hunt) {
    throw new AppError('Hunt not found', 404, 'NOT_FOUND');
  }
}

// Builds Prisma-compatible data from a validated create body.
// clueType is lowercased in schema — toUpperCase() maps to Prisma enum.
function toCreateData(body: CreateClueBody, huntId: string, orderIndex: number) {
  return {
    huntId,
    orderIndex,
    title: body.title,
    description: body.description,
    hintText: body.hintText,
    clueType: body.clueType.toUpperCase() as
      | 'TEXT_RIDDLE'
      | 'IMAGE'
      | 'GPS_PROXIMITY'
      | 'QR_CODE'
      | 'PHOTO_CHALLENGE',
    answer: body.answer,
    imageUrl: body.imageUrl,
    latitude: body.latitude,
    longitude: body.longitude,
    proximityRadiusMeters: body.proximityRadiusMeters,
    isBonus: body.isBonus,
    points: body.points,
    unlockMessage: body.unlockMessage,
  };
}

// Builds Prisma-compatible data from a validated update body.
// Prisma skips undefined fields — only explicitly provided fields are updated.
function toUpdateData(body: UpdateClueBody) {
  return {
    title: body.title,
    description: body.description,
    hintText: body.hintText,
    clueType: body.clueType
      ? (body.clueType.toUpperCase() as
          | 'TEXT_RIDDLE'
          | 'IMAGE'
          | 'GPS_PROXIMITY'
          | 'QR_CODE'
          | 'PHOTO_CHALLENGE')
      : undefined,
    answer: body.answer,
    imageUrl: body.imageUrl,
    latitude: body.latitude,
    longitude: body.longitude,
    proximityRadiusMeters: body.proximityRadiusMeters,
    isBonus: body.isBonus,
    points: body.points,
    unlockMessage: body.unlockMessage,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST / — Create a clue (auto-assigns the next orderIndex for this hunt)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const body = createClueSchema.parse(req.body);

    await requireHunt(huntId);

    // Auto-assign orderIndex as max + 1 (first clue gets 0)
    const last = await prisma.clue.findFirst({
      where: { huntId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const orderIndex = (last?.orderIndex ?? -1) + 1;

    const clue = await prisma.clue.create({
      data: toCreateData(body, huntId, orderIndex),
      include: { sponsorClue: { select: { sponsorId: true } } },
    });

    // Set the PostGIS geography column — used by GPS proximity checks
    await setClueLocation(clue.id, body.latitude, body.longitude);

    // Link sponsor via SponsorClue join table if sponsorId was provided
    if (body.sponsorId) {
      await prisma.sponsorClue.upsert({
        where: { clueId: clue.id },
        create: { sponsorId: body.sponsorId, clueId: clue.id },
        update: { sponsorId: body.sponsorId },
      });
    }

    const response: ApiSuccess<AdminClue> = {
      success: true,
      message: 'Clue created',
      data: toClueResponse({
        ...clue,
        sponsorClue: body.sponsorId ? { sponsorId: body.sponsorId } : null,
      }),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET / — List all clues for a hunt, ordered by orderIndex
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;

    await requireHunt(huntId);

    const clues = await prisma.clue.findMany({
      where: { huntId },
      orderBy: { orderIndex: 'asc' },
      include: { sponsorClue: { select: { sponsorId: true } } },
    });

    const response: ApiSuccess<AdminClue[]> = {
      success: true,
      data: clues.map(toClueResponse),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// PUT /reorder — Batch update orderIndex for multiple clues (atomic transaction).
// Registered before /:clueId routes so Express doesn't treat "reorder" as a clue ID.
router.put('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const body = reorderCluesSchema.parse(req.body);

    await requireHunt(huntId);

    // Verify all provided IDs actually belong to this hunt
    const existing = await prisma.clue.findMany({
      where: { huntId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((c) => c.id));
    const invalid = body.clues.filter((c) => !existingIds.has(c.id));
    if (invalid.length > 0) {
      throw new AppError(
        `Clue IDs not found in this hunt: ${invalid.map((c) => c.id).join(', ')}`,
        400,
        'INVALID_CLUE_IDS',
      );
    }

    // Atomic batch update — all orderIndexes change together or none do
    await prisma.$transaction(
      body.clues.map(({ id, orderIndex }) =>
        prisma.clue.update({ where: { id }, data: { orderIndex } }),
      ),
    );

    // Return the full updated list sorted by new order
    const clues = await prisma.clue.findMany({
      where: { huntId },
      orderBy: { orderIndex: 'asc' },
      include: { sponsorClue: { select: { sponsorId: true } } },
    });

    const response: ApiSuccess<AdminClue[]> = {
      success: true,
      data: clues.map(toClueResponse),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:clueId — Partial update — only provided fields are changed
router.patch('/:clueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const clueId = req.params['clueId'] as string;
    const body = updateClueSchema.parse(req.body);

    // Verify the clue exists and belongs to this hunt
    const existing = await prisma.clue.findUnique({ where: { id: clueId } });
    if (!existing || existing.huntId !== huntId) {
      throw new AppError('Clue not found', 404, 'NOT_FOUND');
    }

    const clue = await prisma.clue.update({
      where: { id: clueId },
      data: toUpdateData(body),
      include: { sponsorClue: { select: { sponsorId: true } } },
    });

    // Update the PostGIS column if coordinates changed
    const lat = body.latitude ?? existing.latitude.toNumber();
    const lng = body.longitude ?? existing.longitude.toNumber();
    if (body.latitude !== undefined || body.longitude !== undefined) {
      await setClueLocation(clueId, lat, lng);
    }

    // Sync SponsorClue join table if sponsorId was explicitly provided
    if (body.sponsorId === null) {
      // Unlink sponsor — delete the SponsorClue row if it exists
      await prisma.sponsorClue.deleteMany({ where: { clueId } });
    } else if (body.sponsorId) {
      // Link or re-link sponsor
      await prisma.sponsorClue.upsert({
        where: { clueId },
        create: { sponsorId: body.sponsorId, clueId },
        update: { sponsorId: body.sponsorId },
      });
    }

    // Re-read sponsorClue after potential update so the response is accurate
    const sponsorClueAfter =
      body.sponsorId === null
        ? null
        : body.sponsorId
          ? { sponsorId: body.sponsorId }
          : clue.sponsorClue;

    const response: ApiSuccess<AdminClue> = {
      success: true,
      data: toClueResponse({ ...clue, sponsorClue: sponsorClueAfter }),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /:clueId — Hard delete (clues are draft content — no need to archive)
router.delete('/:clueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const huntId = req.params['huntId'] as string;
    const clueId = req.params['clueId'] as string;

    // Verify the clue exists and belongs to this hunt
    const existing = await prisma.clue.findUnique({ where: { id: clueId } });
    if (!existing || existing.huntId !== huntId) {
      throw new AppError('Clue not found', 404, 'NOT_FOUND');
    }

    await prisma.clue.delete({ where: { id: clueId } });

    const response: ApiSuccess<null> = {
      success: true,
      data: null,
      message: 'Clue deleted',
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
