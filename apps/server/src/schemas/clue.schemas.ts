// Zod validation schemas for clue create, update, and reorder request bodies.
// Enum values use lowercase (matching shared ClueType) and are uppercased before DB writes.

import { z } from 'zod';

// Schema for a single content item within a clue (text block or image)
const clueContentItemSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE']),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isHint: z.boolean().default(false),
  order: z.number().int().default(0),
});

// Schema for a single answer entry used by PASSWORD unlock type
const clueAnswerItemSchema = z.object({
  answer: z.string().min(1).max(200),
});

// Base clue fields — shared between create and update schemas
const clueFields = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200).trim(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  hintText: z.string().optional(),
  clueType: z.enum(['text_riddle', 'image', 'gps_proximity', 'qr_code', 'photo_challenge']),
  answer: z.string().max(500).optional(), // legacy single-answer field (kept for compatibility)
  imageUrl: z.string().url().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  proximityRadiusMeters: z.number().int().min(5).max(5000).default(50),
  isBonus: z.boolean().default(false),
  points: z.number().int().min(0).default(10),
  unlockMessage: z.string().optional(),
  sponsorId: z.string().uuid().nullable().optional(), // optional sponsor association
  // v2 fields — unlock mechanism and pin visibility
  unlockType: z.enum(['GPS_PROXIMITY', 'PASSWORD', 'PHOTO']).default('GPS_PROXIMITY'),
  locationHidden: z.boolean().default(false),
  contents: z.array(clueContentItemSchema).default([]),
  answers: z.array(clueAnswerItemSchema).default([]),
});

// Create: all fields required except defaults
export const createClueSchema = clueFields;

// Update: everything optional — only provided fields are changed
export const updateClueSchema = clueFields.partial();

// Reorder: accepts an array of {id, orderIndex} pairs for batch update
export const reorderCluesSchema = z.object({
  clues: z
    .array(
      z.object({
        id: z.string().uuid('Each clue ID must be a valid UUID'),
        orderIndex: z.number().int().min(0),
      }),
    )
    .min(1, 'At least one clue is required'),
});

export type CreateClueBody = z.infer<typeof createClueSchema>;
export type UpdateClueBody = z.infer<typeof updateClueSchema>;
export type ReorderCluesBody = z.infer<typeof reorderCluesSchema>;
