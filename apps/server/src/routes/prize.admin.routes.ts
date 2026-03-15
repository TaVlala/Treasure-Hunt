// Admin SponsorPrize CRUD endpoints — create, list, get, update, delete.
// All routes require a valid JWT + admin role.
// Base path: /api/v1/admin/prizes (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import {
  createPrizeSchema,
  updatePrizeSchema,
  listPrizesQuerySchema,
  type CreatePrizeBody,
  type UpdatePrizeBody,
} from '../schemas/prize.schemas';
import type { ApiSuccess, PaginatedData, PrizeType } from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Structural type matching a SponsorPrize row with sponsor include
type PrizeRow = {
  id: string;
  sponsorId: string;
  huntId: string;
  title: string;
  description: string | null;
  prizeType: string;
  valueDescription: string | null;
  expiryDate: Date | null;
  termsConditions: string | null;
  imageUrl: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  redemptionLimit: number | null;
  redemptionsUsed: number;
  createdAt: Date;
  sponsor: {
    id: string;
    businessName: string;
  };
};

// Admin prize response shape (includes sponsorId, redemptionLimit, etc.)
interface AdminPrize {
  id: string;
  sponsorId: string;
  huntId: string;
  title: string;
  description: string | null;
  prizeType: PrizeType;
  valueDescription: string | null;
  expiryDate: string | null;
  termsConditions: string | null;
  imageUrl: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  redemptionLimit: number | null;
  redemptionsUsed: number;
  createdAt: string;
  sponsor: { id: string; businessName: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Converts a Prisma SponsorPrize row (with sponsor include) to the admin response shape
function toPrizeResponse(prize: PrizeRow): AdminPrize {
  return {
    id: prize.id,
    sponsorId: prize.sponsorId,
    huntId: prize.huntId,
    title: prize.title,
    description: prize.description,
    prizeType: prize.prizeType.toLowerCase() as PrizeType,
    valueDescription: prize.valueDescription,
    expiryDate: prize.expiryDate
      ? (prize.expiryDate.toISOString().split('T')[0] ?? null)
      : null,
    termsConditions: prize.termsConditions,
    imageUrl: prize.imageUrl,
    isGrandPrize: prize.isGrandPrize,
    minCluesFound: prize.minCluesFound,
    redemptionLimit: prize.redemptionLimit,
    redemptionsUsed: prize.redemptionsUsed,
    createdAt: prize.createdAt.toISOString(),
    sponsor: {
      id: prize.sponsor.id,
      businessName: prize.sponsor.businessName,
    },
  };
}

// Converts a validated create body to Prisma create data
function toCreateData(body: CreatePrizeBody) {
  return {
    sponsorId: body.sponsorId,
    huntId: body.huntId,
    title: body.title,
    description: body.description,
    prizeType: body.prizeType as 'DISCOUNT' | 'FREE_ITEM' | 'EXPERIENCE' | 'GIFT_CARD' | 'MERCH',
    valueDescription: body.valueDescription,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    termsConditions: body.termsConditions,
    imageUrl: body.imageUrl,
    isGrandPrize: body.isGrandPrize,
    minCluesFound: body.minCluesFound,
    redemptionLimit: body.redemptionLimit,
  };
}

// Converts a validated update body to Prisma update data (undefined fields are skipped)
function toUpdateData(body: UpdatePrizeBody) {
  return {
    sponsorId: body.sponsorId,
    huntId: body.huntId,
    title: body.title,
    description: body.description,
    prizeType: body.prizeType as
      | 'DISCOUNT'
      | 'FREE_ITEM'
      | 'EXPERIENCE'
      | 'GIFT_CARD'
      | 'MERCH'
      | undefined,
    valueDescription: body.valueDescription,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    termsConditions: body.termsConditions,
    imageUrl: body.imageUrl,
    isGrandPrize: body.isGrandPrize,
    minCluesFound: body.minCluesFound,
    redemptionLimit: body.redemptionLimit,
  };
}

// The include used on every query — embeds sponsor.businessName in response
const WITH_SPONSOR = { sponsor: { select: { id: true, businessName: true } } } as const;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET / — List prizes with optional huntId / sponsorId filters, paginated
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listPrizesQuerySchema.parse(req.query);

    const where = {
      ...(query.huntId && { huntId: query.huntId }),
      ...(query.sponsorId && { sponsorId: query.sponsorId }),
    };

    const [total, prizes] = await Promise.all([
      prisma.sponsorPrize.count({ where }),
      prisma.sponsorPrize.findMany({
        where,
        include: WITH_SPONSOR,
        orderBy: [{ isGrandPrize: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const response: ApiSuccess<PaginatedData<AdminPrize>> = {
      success: true,
      data: {
        items: prizes.map(toPrizeResponse),
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

// GET /:id — Get a single prize with sponsor info
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const prize = await prisma.sponsorPrize.findUnique({
      where: { id },
      include: WITH_SPONSOR,
    });

    if (!prize) {
      throw new AppError('Prize not found', 404, 'NOT_FOUND');
    }

    const response: ApiSuccess<AdminPrize> = {
      success: true,
      data: toPrizeResponse(prize),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST / — Create a new prize
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createPrizeSchema.parse(req.body);

    const prize = await prisma.sponsorPrize.create({
      data: toCreateData(body),
      include: WITH_SPONSOR,
    });

    const response: ApiSuccess<AdminPrize> = {
      success: true,
      message: 'Prize created',
      data: toPrizeResponse(prize),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — Partial update — only provided fields are changed
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const body = updatePrizeSchema.parse(req.body);

    const existing = await prisma.sponsorPrize.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Prize not found', 404, 'NOT_FOUND');
    }

    const prize = await prisma.sponsorPrize.update({
      where: { id },
      data: toUpdateData(body),
      include: WITH_SPONSOR,
    });

    const response: ApiSuccess<AdminPrize> = {
      success: true,
      data: toPrizeResponse(prize),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Hard delete the prize record
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.sponsorPrize.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Prize not found', 404, 'NOT_FOUND');
    }

    await prisma.sponsorPrize.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
