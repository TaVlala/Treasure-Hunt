// Admin Hunt CRUD endpoints — create, list, get, update, soft-delete.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/hunts (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import type { ClueType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import {
  createHuntSchema,
  updateHuntSchema,
  listHuntsQuerySchema,
  type CreateHuntBody,
  type UpdateHuntBody,
} from '../schemas/hunt.schemas';
import type {
  ApiSuccess,
  Hunt,
  HuntDetail,
  PaginatedData,
  HuntDifficulty,
  HuntTheme,
  HuntType,
  TeamMode,
  HuntStatus,
  HuntStartMode,
} from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generates a URL-safe slug from a title string
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Returns a unique slug — appends -2, -3, etc. until no collision is found
async function resolveUniqueSlug(title: string, providedSlug?: string): Promise<string> {
  const base = providedSlug ?? generateSlug(title);
  let slug = base;
  let counter = 2;
  for (;;) {
    const existing = await prisma.hunt.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

// Structural type that Prisma hunt rows satisfy — avoids importing Prisma.Decimal directly
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
  startMode: string;
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
    startMode: hunt.startMode.toLowerCase() as HuntStartMode,
    createdAt: hunt.createdAt.toISOString(),
  };
}

// Builds the Prisma-compatible data object from a validated create body
function toCreateData(body: CreateHuntBody, slug: string, userId: string) {
  return {
    title: body.title,
    slug,
    description: body.description,
    city: body.city,
    region: body.region,
    difficulty: body.difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
    theme: body.theme.toUpperCase() as
      | 'GENERAL'
      | 'CHRISTMAS'
      | 'HALLOWEEN'
      | 'SUMMER'
      | 'FESTIVAL'
      | 'CUSTOM',
    huntType: body.huntType.toUpperCase() as 'FREE' | 'PAID',
    ticketPriceCents: body.ticketPriceCents,
    currency: body.currency,
    timeLimitMinutes: body.timeLimitMinutes,
    maxPlayers: body.maxPlayers,
    teamMode: body.teamMode.toUpperCase() as 'SOLO' | 'TEAM' | 'BOTH',
    maxTeamSize: body.maxTeamSize,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    thumbnailUrl: body.thumbnailUrl,
    coverImageUrl: body.coverImageUrl,
    centerLat: body.centerLat,
    centerLng: body.centerLng,
    zoomLevel: body.zoomLevel,
    whitelabelName: body.whitelabelName,
    whitelabelLogoUrl: body.whitelabelLogoUrl,
    whitelabelColor: body.whitelabelColor,
    metaTitle: body.metaTitle,
    metaDescription: body.metaDescription,
    startMode: (body.startMode ?? 'LOCATION_FIRST') as 'CLUE_FIRST' | 'LOCATION_FIRST',
    createdBy: userId,
    status: 'DRAFT' as const,
  };
}

// Builds the Prisma-compatible data object from a validated update body.
// Prisma skips undefined fields — only explicitly provided fields are updated.
function toUpdateData(body: UpdateHuntBody) {
  return {
    title: body.title,
    description: body.description,
    city: body.city,
    region: body.region,
    difficulty: body.difficulty
      ? (body.difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD')
      : undefined,
    theme: body.theme
      ? (body.theme.toUpperCase() as
          | 'GENERAL'
          | 'CHRISTMAS'
          | 'HALLOWEEN'
          | 'SUMMER'
          | 'FESTIVAL'
          | 'CUSTOM')
      : undefined,
    huntType: body.huntType ? (body.huntType.toUpperCase() as 'FREE' | 'PAID') : undefined,
    ticketPriceCents: body.ticketPriceCents,
    currency: body.currency,
    timeLimitMinutes: body.timeLimitMinutes,
    maxPlayers: body.maxPlayers,
    teamMode: body.teamMode
      ? (body.teamMode.toUpperCase() as 'SOLO' | 'TEAM' | 'BOTH')
      : undefined,
    maxTeamSize: body.maxTeamSize,
    status: body.status
      ? (body.status.toUpperCase() as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED')
      : undefined,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    thumbnailUrl: body.thumbnailUrl,
    coverImageUrl: body.coverImageUrl,
    centerLat: body.centerLat,
    centerLng: body.centerLng,
    zoomLevel: body.zoomLevel,
    whitelabelName: body.whitelabelName,
    whitelabelLogoUrl: body.whitelabelLogoUrl,
    whitelabelColor: body.whitelabelColor,
    metaTitle: body.metaTitle,
    metaDescription: body.metaDescription,
    startMode: body.startMode
      ? (body.startMode as 'CLUE_FIRST' | 'LOCATION_FIRST')
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST / — Create a new hunt (status always starts as DRAFT)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createHuntSchema.parse(req.body);
    const slug = await resolveUniqueSlug(body.title, body.slug);

    const hunt = await prisma.hunt.create({
      data: toCreateData(body, slug, req.user!.id),
    });

    const response: ApiSuccess<Hunt> = {
      success: true,
      message: 'Hunt created',
      data: toHuntResponse(hunt),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET / — List all hunts with optional status + city filters, paginated
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listHuntsQuerySchema.parse(req.query);

    // Build where filter — status and city are optional
    const where = {
      ...(query.status && { status: query.status.toUpperCase() as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' }),
      // query.city is string | undefined — assert string inside the truthy branch
      ...(query.city && { city: { contains: query.city as string, mode: 'insensitive' as const } }),
    };

    const [total, hunts] = await Promise.all([
      prisma.hunt.count({ where }),
      prisma.hunt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const response: ApiSuccess<PaginatedData<Hunt>> = {
      success: true,
      data: {
        items: hunts.map(toHuntResponse),
        total,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: query.page * query.pageSize < total,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /:id — Get a single hunt by ID, including clue count
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Express 5 types ParamsDictionary as string | string[] — assert string for named params
    const id = req.params['id'] as string;
    const hunt = await prisma.hunt.findUnique({
      where: { id },
      include: { _count: { select: { clues: true } } },
    });

    if (!hunt) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }

    const response: ApiSuccess<HuntDetail> = {
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

// PATCH /:id — Partial update — only provided fields are changed
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const body = updateHuntSchema.parse(req.body);

    // Verify the hunt exists before attempting update
    const existing = await prisma.hunt.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }

    const hunt = await prisma.hunt.update({
      where: { id },
      data: toUpdateData(body),
    });

    const response: ApiSuccess<Hunt> = {
      success: true,
      data: toHuntResponse(hunt),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Soft delete: sets status to ARCHIVED (no hard deletes)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const existing = await prisma.hunt.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }
    if (existing.status === 'ARCHIVED') {
      throw new AppError('Hunt is already archived', 409, 'ALREADY_ARCHIVED');
    }

    const hunt = await prisma.hunt.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    const response: ApiSuccess<Hunt> = {
      success: true,
      message: 'Hunt archived',
      data: toHuntResponse(hunt),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// Structural type matching what prisma.clue.findMany returns for a clue row
type ClueRow = {
  id: string;
  huntId: string;
  orderIndex: number;
  title: string;
  description: string;
  hintText: string | null;
  clueType: ClueType;
  answer: string | null;
  imageUrl: string | null;
  latitude: PrismaDecimal;
  longitude: PrismaDecimal;
  proximityRadiusMeters: number;
  isBonus: boolean;
  points: number;
  unlockMessage: string | null;
};

// POST /:id/duplicate — Clone a hunt as a new DRAFT, copying all fields + clues
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    // Fetch the original hunt to clone
    const original = await prisma.hunt.findUnique({ where: { id } });
    if (!original) {
      throw new AppError('Hunt not found', 404, 'NOT_FOUND');
    }

    // Resolve a unique slug based on the original title with " Copy" suffix
    const newSlug = await resolveUniqueSlug(original.title + ' Copy');

    // Create the new hunt as a DRAFT owned by the current admin
    const newHunt = await prisma.hunt.create({
      data: {
        title: original.title + ' Copy',
        slug: newSlug,
        description: original.description,
        city: original.city,
        region: original.region,
        difficulty: original.difficulty,
        theme: original.theme,
        huntType: original.huntType,
        ticketPriceCents: original.ticketPriceCents,
        currency: original.currency,
        timeLimitMinutes: original.timeLimitMinutes,
        maxPlayers: original.maxPlayers,
        teamMode: original.teamMode,
        maxTeamSize: original.maxTeamSize,
        status: 'DRAFT',
        startsAt: original.startsAt,
        endsAt: original.endsAt,
        thumbnailUrl: original.thumbnailUrl,
        coverImageUrl: original.coverImageUrl,
        centerLat: original.centerLat,
        centerLng: original.centerLng,
        zoomLevel: original.zoomLevel,
        whitelabelName: original.whitelabelName,
        whitelabelLogoUrl: original.whitelabelLogoUrl,
        whitelabelColor: original.whitelabelColor,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        createdBy: req.user!.id,
      },
    });

    // Fetch all clues from the original hunt in order
    const clues = await prisma.clue.findMany({
      where: { huntId: id },
      orderBy: { orderIndex: 'asc' },
    }) as ClueRow[];

    // Clone each clue and update its PostGIS geography column via raw SQL
    for (const clue of clues) {
      const newClue = await prisma.clue.create({
        data: {
          huntId: newHunt.id,
          orderIndex: clue.orderIndex,
          title: clue.title,
          description: clue.description,
          hintText: clue.hintText,
          clueType: clue.clueType,
          answer: clue.answer,
          imageUrl: clue.imageUrl,
          latitude: clue.latitude.toNumber(),
          longitude: clue.longitude.toNumber(),
          proximityRadiusMeters: clue.proximityRadiusMeters,
          isBonus: clue.isBonus,
          points: clue.points,
          unlockMessage: clue.unlockMessage,
        },
      });

      // Set the PostGIS geography column — cannot be set via Prisma directly
      await prisma.$executeRaw`UPDATE clues SET location = ST_SetSRID(ST_MakePoint(${clue.longitude}::float, ${clue.latitude}::float), 4326) WHERE id = ${newClue.id}`;
    }

    const response: ApiSuccess<Hunt> = {
      success: true,
      message: 'Hunt duplicated',
      data: toHuntResponse(newHunt),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /bulk — Apply a batch action to multiple hunts by ID
// Actions: 'publish' (ACTIVE), 'archive' (ARCHIVED), 'duplicate' (new DRAFTs)
// ---------------------------------------------------------------------------

const BULK_ACTIONS = ['publish', 'archive', 'duplicate'] as const;
type BulkAction = (typeof BULK_ACTIONS)[number];

interface BulkRequestBody {
  ids: string[];
  action: BulkAction;
}

router.post('/bulk', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as BulkRequestBody;

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new AppError('ids must be a non-empty array', 400, 'VALIDATION_ERROR');
    }
    if (!BULK_ACTIONS.includes(body.action)) {
      throw new AppError(`action must be one of: ${BULK_ACTIONS.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    if (body.ids.length > 50) {
      throw new AppError('Cannot bulk-operate on more than 50 hunts at once', 400, 'VALIDATION_ERROR');
    }

    const ids = body.ids;

    if (body.action === 'publish') {
      await prisma.hunt.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ACTIVE' },
      });
      res.json({ success: true, message: `${ids.length} hunt(s) published`, data: { affected: ids.length } });
      return;
    }

    if (body.action === 'archive') {
      await prisma.hunt.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ARCHIVED' },
      });
      res.json({ success: true, message: `${ids.length} hunt(s) archived`, data: { affected: ids.length } });
      return;
    }

    // Duplicate — clone each hunt + clues as new DRAFTs
    if (body.action === 'duplicate') {
      const originals = await prisma.hunt.findMany({ where: { id: { in: ids } } });
      const newIds: string[] = [];

      for (const original of originals) {
        const newSlug = await resolveUniqueSlug(original.title + ' Copy');
        const newHunt = await prisma.hunt.create({
          data: {
            title: original.title + ' Copy',
            slug: newSlug,
            description: original.description,
            city: original.city,
            region: original.region,
            difficulty: original.difficulty,
            theme: original.theme,
            huntType: original.huntType,
            ticketPriceCents: original.ticketPriceCents,
            currency: original.currency,
            timeLimitMinutes: original.timeLimitMinutes,
            maxPlayers: original.maxPlayers,
            teamMode: original.teamMode,
            maxTeamSize: original.maxTeamSize,
            status: 'DRAFT',
            startsAt: original.startsAt,
            endsAt: original.endsAt,
            thumbnailUrl: original.thumbnailUrl,
            coverImageUrl: original.coverImageUrl,
            centerLat: original.centerLat.toNumber(),
            centerLng: original.centerLng.toNumber(),
            zoomLevel: original.zoomLevel,
            whitelabelName: original.whitelabelName,
            whitelabelLogoUrl: original.whitelabelLogoUrl,
            whitelabelColor: original.whitelabelColor,
            metaTitle: original.metaTitle,
            metaDescription: original.metaDescription,
            createdBy: req.user!.id,
          },
        });
        newIds.push(newHunt.id);

        // Clone clues with PostGIS geography
        const clues = await prisma.clue.findMany({ where: { huntId: original.id }, orderBy: { orderIndex: 'asc' } }) as ClueRow[];
        for (const clue of clues) {
          const newClue = await prisma.clue.create({
            data: {
              huntId: newHunt.id,
              orderIndex: clue.orderIndex,
              title: clue.title,
              description: clue.description,
              hintText: clue.hintText,
              clueType: clue.clueType,
              answer: clue.answer,
              imageUrl: clue.imageUrl,
              latitude: clue.latitude.toNumber(),
              longitude: clue.longitude.toNumber(),
              proximityRadiusMeters: clue.proximityRadiusMeters,
              isBonus: clue.isBonus,
              points: clue.points,
              unlockMessage: clue.unlockMessage,
            },
          });
          await prisma.$executeRaw`UPDATE clues SET location = ST_SetSRID(ST_MakePoint(${clue.longitude}::float, ${clue.latitude}::float), 4326) WHERE id = ${newClue.id}`;
        }
      }

      res.json({ success: true, message: `${originals.length} hunt(s) duplicated`, data: { affected: originals.length, newIds } });
      return;
    }
    // Unreachable — all actions handled above
    next(new AppError('Unknown action', 400, 'VALIDATION_ERROR'));
  } catch (err) {
    next(err);
  }
});

export default router;
