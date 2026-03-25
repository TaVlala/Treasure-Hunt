// Zod validation schemas for player-facing game endpoints.

import { z } from 'zod';

// Body for POST /api/v1/game/proximity-check
export const proximityCheckSchema = z.object({
  clueId: z.string().uuid('clueId must be a valid UUID'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Body for POST /api/v1/game/sessions (join / start a hunt)
export const joinHuntSchema = z.object({
  huntId: z.string().uuid('huntId must be a valid UUID'),
});

// Body for POST /api/v1/game/sessions/:sessionId/submit
export const submitClueSchema = z.object({
  clueId: z.string().uuid('clueId must be a valid UUID'),
  method: z.enum(['gps', 'qr_code', 'answer', 'photo']),
  // Required when method is 'answer'
  answer: z.string().max(500).optional(),
  // Required when method is 'qr_code'
  qrPayload: z.string().max(200).optional(),
});

// Body for POST /api/v1/game/sessions/:sessionId/hint
export const useHintSchema = z.object({
  clueId: z.string().uuid('clueId must be a valid UUID'),
});

// Query params for GET /api/v1/game/hunts/:huntId/leaderboard
export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProximityCheckBody = z.infer<typeof proximityCheckSchema>;
export type JoinHuntBody = z.infer<typeof joinHuntSchema>;
export type SubmitClueBody = z.infer<typeof submitClueSchema>;
export type UseHintBody = z.infer<typeof useHintSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
