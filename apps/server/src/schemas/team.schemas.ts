// Zod validation schemas for team endpoints.
// Used by team.routes.ts to validate request bodies before hitting the database.

import { z } from 'zod';

// Schema for creating a new team — requires a display name and the hunt to attach to
export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  huntId: z.string().uuid(),
});

// Schema for joining an existing team via its invite code
export const joinTeamSchema = z.object({
  inviteCode: z.string().min(6).max(20),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
