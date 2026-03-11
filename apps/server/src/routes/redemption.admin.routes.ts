// Admin redemption validation endpoints — look up and confirm prize redemptions by QR code.
// Used by sponsor staff to scan a player's QR code and mark the prize as redeemed.
// All routes require a valid JWT + admin role.
// Base path: /api/v1/admin/redemptions (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import type { ApiSuccess, Redemption, RedemptionStatus } from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Shape returned to the admin when looking up a redemption — includes prize + player info
export interface RedemptionDetail {
  redemption: Redemption;
  prize: {
    id: string;
    title: string;
    prizeType: string;
    valueDescription: string | null;
    sponsor: { businessName: string };
  };
  player: {
    id: string;
    displayName: string;
    email: string;
  };
}

// Maps a Prisma redemption row to the shared Redemption type
function toRedemption(r: {
  id: string;
  prizeId: string;
  playerId: string;
  sessionId: string;
  qrCode: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}): Redemption {
  return {
    id: r.id,
    prizeId: r.prizeId,
    playerId: r.playerId,
    sessionId: r.sessionId,
    qrCode: r.qrCode,
    status: r.status.toLowerCase() as RedemptionStatus,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /:qrCode — look up a redemption by QR code before confirming.
// Returns prize title, type, sponsor, and player name so staff can verify.
router.get('/:qrCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrCode = req.params['qrCode'] as string;

    const row = await prisma.redemption.findUnique({
      where: { qrCode },
      include: {
        prize: {
          select: {
            id: true,
            title: true,
            prizeType: true,
            valueDescription: true,
            sponsor: { select: { businessName: true } },
          },
        },
        player: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!row) throw new AppError('QR code not found', 404, 'NOT_FOUND');

    const data: RedemptionDetail = {
      redemption: toRedemption(row),
      prize: {
        id: row.prize.id,
        title: row.prize.title,
        prizeType: row.prize.prizeType.toLowerCase(),
        valueDescription: row.prize.valueDescription,
        sponsor: { businessName: row.prize.sponsor.businessName },
      },
      player: {
        id: row.player.id,
        displayName: row.player.displayName,
        email: row.player.email,
      },
    };

    const response: ApiSuccess<RedemptionDetail> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /:qrCode/validate — mark a redemption as REDEEMED.
// Rejects if already redeemed or expired; records the admin's user ID as redeemedBy.
router.post('/:qrCode/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrCode = req.params['qrCode'] as string;
    const adminId = req.user!.id;

    const existing = await prisma.redemption.findUnique({
      where: { qrCode },
    });

    if (!existing) throw new AppError('QR code not found', 404, 'NOT_FOUND');

    if (existing.status === 'REDEEMED') {
      throw new AppError('This prize has already been redeemed', 409, 'CONFLICT');
    }
    if (existing.status === 'EXPIRED' || existing.expiresAt < new Date()) {
      throw new AppError('This redemption QR code has expired', 410, 'GONE');
    }

    // Mark as redeemed — record who validated it and when
    const updated = await prisma.redemption.update({
      where: { qrCode },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedBy: adminId,
      },
    });

    const data: Redemption = toRedemption(updated);
    const response: ApiSuccess<Redemption> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
