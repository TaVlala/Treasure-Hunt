// Admin Player Management endpoints — list, detail, and status toggle for player accounts.
// All routes require a valid JWT + admin role (enforced via router-level middleware).
// Base path: /api/v1/admin/players (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authenticate';
import type { ApiSuccess, PaginatedData } from '@treasure-hunt/shared';

const router = Router();

// Every route in this file requires a valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Represents a single player entry in the list and detail responses
interface PlayerListItem {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  homeCity: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  sessionCount: number;
}

// A recent game session summary attached to a player detail response
interface RecentSession {
  id: string;
  huntId: string;
  huntTitle: string;
  status: string;
  score: number;
  cluesFound: number;
  startedAt: string;
  completedAt: string | null;
}

// Full player detail — PlayerListItem extended with recent sessions
interface PlayerDetail extends PlayerListItem {
  recentSessions: RecentSession[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Converts a Prisma user row (with _count) to the PlayerListItem API shape
function toPlayerListItem(
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    homeCity: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    _count: { gameSessions: number };
  },
): PlayerListItem {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    homeCity: user.homeCity,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    sessionCount: user._count.gameSessions,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET / — List players with pagination, optional search (email/displayName), and status filter
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawPage = parseInt(req.query['page'] as string ?? '1', 10);
    const rawPageSize = parseInt(req.query['pageSize'] as string ?? '20', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const pageSize = isNaN(rawPageSize) || rawPageSize < 1 ? 20 : Math.min(rawPageSize, 100);
    const search = (req.query['search'] as string | undefined)?.trim() || undefined;
    const statusParam = req.query['status'] as string | undefined;

    // Build where clause — always restrict to player role
    const where = {
      role: 'PLAYER' as const,
      ...(statusParam === 'active' && { isActive: true }),
      ...(statusParam === 'inactive' && { isActive: false }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { displayName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Fetch count and page in parallel
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          homeCity: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { gameSessions: true } },
        },
      }),
    ]);

    const response: ApiSuccess<PaginatedData<PlayerListItem>> = {
      success: true,
      data: {
        items: users.map(toPlayerListItem),
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

// GET /:id — Get a single player by ID with their 5 most recent hunt sessions
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Express 5: params typed as string | string[] — assert string for named params
    const id = req.params['id'] as string;

    // Fetch user and recent sessions in parallel
    const [user, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id, role: 'PLAYER' },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          homeCity: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { gameSessions: true } },
        },
      }),
      prisma.gameSession.findMany({
        where: { playerId: id },
        include: { hunt: { select: { title: true } } },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!user) {
      throw new AppError('Player not found', 404, 'NOT_FOUND');
    }

    // Map recent sessions to the API shape
    const recentSessions: RecentSession[] = sessions.map((s) => ({
      id: s.id,
      huntId: s.huntId,
      huntTitle: s.hunt.title,
      status: s.status.toLowerCase(),
      score: s.score,
      cluesFound: s.cluesFound,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
    }));

    const response: ApiSuccess<PlayerDetail> = {
      success: true,
      data: {
        ...toPlayerListItem(user),
        recentSessions,
      },
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status — Toggle a player account active or inactive
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const body = req.body as { isActive?: unknown };

    // Validate the isActive field is present and boolean
    if (typeof body.isActive !== 'boolean') {
      throw new AppError('isActive must be a boolean', 400, 'VALIDATION_ERROR');
    }

    // Confirm the player exists before attempting update
    const existing = await prisma.user.findUnique({ where: { id, role: 'PLAYER' } });
    if (!existing) {
      throw new AppError('Player not found', 404, 'NOT_FOUND');
    }

    // Update isActive and re-fetch with session count for a complete response
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: body.isActive },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        homeCity: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { gameSessions: true } },
      },
    });

    const response: ApiSuccess<PlayerListItem> = {
      success: true,
      message: `Player ${body.isActive ? 'activated' : 'deactivated'}`,
      data: toPlayerListItem(updated),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
