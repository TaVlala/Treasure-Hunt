// Zod validation schemas for player-facing game endpoints.

import { z } from 'zod';

// Body for POST /api/v1/game/proximity-check
export const proximityCheckSchema = z.object({
  clueId: z.string().uuid('clueId must be a valid UUID'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ProximityCheckBody = z.infer<typeof proximityCheckSchema>;
