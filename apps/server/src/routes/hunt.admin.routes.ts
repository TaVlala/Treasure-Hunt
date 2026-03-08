// Admin Hunt CRUD endpoints — create, list, get, update, soft-delete.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/hunts (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
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

export default router;
