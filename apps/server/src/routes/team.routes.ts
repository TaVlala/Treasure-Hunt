// Player-facing team endpoints — create teams, join by invite code, and fetch team info.
// All routes require a valid player JWT via the authenticate middleware.
// Base path: /api/v1/teams (registered in index.ts).

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { createTeamSchema, joinTeamSchema } from '../schemas/team.schemas';
import type { ApiSuccess } from '@treasure-hunt/shared';

const router = Router();

// All team routes require a valid JWT
router.use(authenticate);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeamResponse = {
  id: string;
  name: string;
  huntId: string;
  inviteCode: string;
  creatorId: string;
  memberCount: number;
};

type TeamWithMembers = {
  id: string;
  name: string;
  huntId: string;
  inviteCode: string;
  creatorId: string;
  members: { userId: string; displayName: string }[];
};

type SessionRef = {
  id: string;
  teamId: string | null;
};

// Generates a random 8-character uppercase invite code
function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ---------------------------------------------------------------------------
// POST / — Create a new team for a hunt
// ---------------------------------------------------------------------------
// The requesting player must have an ACTIVE game session for the given huntId.
// Creates the Team, adds the creator as the first TeamMember, and links the session.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.id;

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid request body: name (string) and huntId (UUID) are required', 400, 'BAD_REQUEST');
    }
    const { name, huntId } = parsed.data;

    // Player must have an active session for this hunt
    const session = await prisma.gameSession.findUnique({
      where: { huntId_playerId: { huntId, playerId } },
      select: { id: true, status: true, teamId: true },
    });
    if (!session || session.status !== 'ACTIVE') {
      throw new AppError('You must have an active session for this hunt to create a team', 403, 'FORBIDDEN');
    }

    // Create the team with a unique invite code (retry on collision)
    let team;
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      try {
        team = await prisma.team.create({
          data: {
            name,
            huntId,
            inviteCode,
            createdBy: playerId,
          },
        });
        break;
      } catch (err: unknown) {
        // Unique constraint violation on invite_code — try again
        const isUniqueViolation =
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002';
        if (!isUniqueViolation || attempt === 4) throw err;
      }
    }

    if (!team) {
      throw new AppError('Failed to generate unique invite code', 500, 'INTERNAL_ERROR');
    }

    // Add creator as first team member and link the session in a transaction
    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: team.id, userId: playerId },
      }),
      prisma.gameSession.update({
        where: { id: session.id },
        data: { teamId: team.id },
      }),
    ]);

    const data: { team: TeamResponse; session: SessionRef } = {
      team: {
        id: team.id,
        name: team.name,
        huntId: team.huntId,
        inviteCode: team.inviteCode,
        creatorId: team.createdBy,
        memberCount: 1,
      },
      session: {
        id: session.id,
        teamId: team.id,
      },
    };

    const response: ApiSuccess<typeof data> = { success: true, data };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /join — Join a team using an invite code
// ---------------------------------------------------------------------------
// Player must have an ACTIVE session for the team's hunt and not already be a member.
router.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.id;

    const parsed = joinTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid request body: inviteCode (string) is required', 400, 'BAD_REQUEST');
    }
    const { inviteCode } = parsed.data;

    // Look up the team by invite code
    const team = await prisma.team.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { _count: { select: { members: true } } },
    });
    if (!team) {
      throw new AppError('Team not found — check the invite code and try again', 404, 'NOT_FOUND');
    }

    // Player must have an active session for this hunt
    const session = await prisma.gameSession.findUnique({
      where: { huntId_playerId: { huntId: team.huntId, playerId } },
      select: { id: true, status: true, teamId: true },
    });
    if (!session || session.status !== 'ACTIVE') {
      throw new AppError('You must have an active session for this hunt to join a team', 403, 'FORBIDDEN');
    }

    // Check the player is not already a member of this team
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: playerId } },
    });
    if (existingMember) {
      throw new AppError('You are already a member of this team', 409, 'CONFLICT');
    }

    // Add member and link session in a transaction
    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: team.id, userId: playerId },
      }),
      prisma.gameSession.update({
        where: { id: session.id },
        data: { teamId: team.id },
      }),
    ]);

    const memberCount = team._count.members + 1;

    const data: { team: TeamResponse; session: SessionRef } = {
      team: {
        id: team.id,
        name: team.name,
        huntId: team.huntId,
        inviteCode: team.inviteCode,
        creatorId: team.createdBy,
        memberCount,
      },
      session: {
        id: session.id,
        teamId: team.id,
      },
    };

    const response: ApiSuccess<typeof data> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:teamId — Fetch team info with members
// ---------------------------------------------------------------------------
// Returns team metadata and the list of members with their display names.
router.get('/:teamId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params['teamId'] as string;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { displayName: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'NOT_FOUND');
    }

    const data: TeamWithMembers = {
      id: team.id,
      name: team.name,
      huntId: team.huntId,
      inviteCode: team.inviteCode,
      creatorId: team.createdBy,
      members: team.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
      })),
    };

    const response: ApiSuccess<TeamWithMembers> = { success: true, data };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
