// Admin Sponsor CRUD endpoints — create, list, get, update, soft-delete.
// All routes require a valid JWT + admin role.
// Base path: /api/v1/admin/sponsors (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import {
  createSponsorSchema,
  updateSponsorSchema,
  listSponsorsQuerySchema,
  type CreateSponsorBody,
  type UpdateSponsorBody,
} from '../schemas/sponsor.schemas';
import type {
  ApiSuccess,
  PaginatedData,
  Sponsor,
  SponsorDetail,
  SponsorTier,
  SponsorStatus,
} from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PrismaDecimal = { toNumber(): number };

// Structural type matching Prisma Sponsor rows (including the _count include)
type SponsorRow = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  address: string;
  latitude: PrismaDecimal;
  longitude: PrismaDecimal;
  tier: string;
  status: string;
  contractStart: Date | null;
  contractEnd: Date | null;
  monthlyFeeCents: number | null;
  notes: string | null;
  createdAt: Date;
  _count: { sponsorClues: number };
};

// Converts a Prisma sponsor row (with _count) to the shared SponsorDetail shape
function toSponsorResponse(sponsor: SponsorRow): SponsorDetail {
  return {
    id: sponsor.id,
    businessName: sponsor.businessName,
    contactName: sponsor.contactName,
    contactEmail: sponsor.contactEmail,
    contactPhone: sponsor.contactPhone,
    websiteUrl: sponsor.websiteUrl,
    logoUrl: sponsor.logoUrl,
    description: sponsor.description,
    address: sponsor.address,
    latitude: sponsor.latitude.toNumber(),
    longitude: sponsor.longitude.toNumber(),
    tier: sponsor.tier.toLowerCase() as SponsorTier,
    status: sponsor.status.toLowerCase() as SponsorStatus,
    // DATE columns — convert to YYYY-MM-DD by taking the date portion of ISO string
    contractStart: sponsor.contractStart
      ? sponsor.contractStart.toISOString().split('T')[0] ?? null
      : null,
    contractEnd: sponsor.contractEnd
      ? sponsor.contractEnd.toISOString().split('T')[0] ?? null
      : null,
    monthlyFeeCents: sponsor.monthlyFeeCents,
    notes: sponsor.notes,
    createdAt: sponsor.createdAt.toISOString(),
    clueCount: sponsor._count.sponsorClues,
  };
}

// Builds Prisma data from a validated create body
function toCreateData(body: CreateSponsorBody) {
  return {
    businessName: body.businessName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    websiteUrl: body.websiteUrl,
    logoUrl: body.logoUrl,
    description: body.description,
    address: body.address,
    latitude: body.latitude,
    longitude: body.longitude,
    tier: body.tier.toUpperCase() as 'BASIC' | 'FEATURED' | 'PRIZE',
    contractStart: body.contractStart ? new Date(body.contractStart) : undefined,
    contractEnd: body.contractEnd ? new Date(body.contractEnd) : undefined,
    monthlyFeeCents: body.monthlyFeeCents,
    notes: body.notes,
    status: 'ACTIVE' as const,
  };
}

// Builds Prisma data from a validated update body (Prisma skips undefined fields)
function toUpdateData(body: UpdateSponsorBody) {
  return {
    businessName: body.businessName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    websiteUrl: body.websiteUrl,
    logoUrl: body.logoUrl,
    description: body.description,
    address: body.address,
    latitude: body.latitude,
    longitude: body.longitude,
    tier: body.tier ? (body.tier.toUpperCase() as 'BASIC' | 'FEATURED' | 'PRIZE') : undefined,
    status: body.status
      ? (body.status.toUpperCase() as 'ACTIVE' | 'PAUSED' | 'EXPIRED')
      : undefined,
    contractStart: body.contractStart ? new Date(body.contractStart) : undefined,
    contractEnd: body.contractEnd ? new Date(body.contractEnd) : undefined,
    monthlyFeeCents: body.monthlyFeeCents,
    notes: body.notes,
  };
}

// Updates the PostGIS geography column — call after any lat/lng write
// ST_MakePoint(longitude, latitude) — PostGIS uses (lng, lat) order
async function setSponsorLocation(sponsorId: string, lat: number, lng: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE sponsors
    SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
    WHERE id = ${sponsorId}::uuid
  `;
}

// The include used on every query — returns _count for clueCount in response
const WITH_COUNT = { _count: { select: { sponsorClues: true } } } as const;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST / — Create a sponsor (status always starts as ACTIVE)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSponsorSchema.parse(req.body);

    const sponsor = await prisma.sponsor.create({
      data: toCreateData(body),
      include: WITH_COUNT,
    });

    // Set the PostGIS geography column for proximity/map queries
    await setSponsorLocation(sponsor.id, body.latitude, body.longitude);

    const response: ApiSuccess<SponsorDetail> = {
      success: true,
      message: 'Sponsor created',
      data: toSponsorResponse(sponsor),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET / — List sponsors with optional tier + status filters, paginated
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listSponsorsQuerySchema.parse(req.query);

    const where = {
      ...(query.tier && { tier: query.tier.toUpperCase() as 'BASIC' | 'FEATURED' | 'PRIZE' }),
      ...(query.status && {
        status: query.status.toUpperCase() as 'ACTIVE' | 'PAUSED' | 'EXPIRED',
      }),
    };

    const [total, sponsors] = await Promise.all([
      prisma.sponsor.count({ where }),
      prisma.sponsor.findMany({
        where,
        include: WITH_COUNT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const response: ApiSuccess<PaginatedData<SponsorDetail>> = {
      success: true,
      data: {
        items: sponsors.map(toSponsorResponse),
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

// GET /:id — Get a single sponsor with linked clue count
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
      include: WITH_COUNT,
    });

    if (!sponsor) {
      throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
    }

    const response: ApiSuccess<SponsorDetail> = {
      success: true,
      data: toSponsorResponse(sponsor),
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
    const body = updateSponsorSchema.parse(req.body);

    const existing = await prisma.sponsor.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
    }

    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: toUpdateData(body),
      include: WITH_COUNT,
    });

    // Update PostGIS column only if coordinates were explicitly provided
    if (body.latitude !== undefined || body.longitude !== undefined) {
      const lat = body.latitude ?? existing.latitude.toNumber();
      const lng = body.longitude ?? existing.longitude.toNumber();
      await setSponsorLocation(id, lat, lng);
    }

    const response: ApiSuccess<SponsorDetail> = {
      success: true,
      data: toSponsorResponse(sponsor),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Soft delete: sets status to EXPIRED
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.sponsor.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Sponsor not found', 404, 'NOT_FOUND');
    }
    if (existing.status === 'EXPIRED') {
      throw new AppError('Sponsor is already expired', 409, 'ALREADY_EXPIRED');
    }

    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: { status: 'EXPIRED' },
      include: WITH_COUNT,
    });

    const response: ApiSuccess<SponsorDetail> = {
      success: true,
      message: 'Sponsor expired',
      data: toSponsorResponse(sponsor),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
