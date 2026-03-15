// Zod validation schemas for SponsorPrize create, update, and list request bodies.
// Enum values use uppercase (matching Prisma PrizeType enum).

import { z } from 'zod';

const PRIZE_TYPES = ['DISCOUNT', 'FREE_ITEM', 'EXPERIENCE', 'GIFT_CARD', 'MERCH'] as const;

// Base prize fields — shared between create and update schemas
const prizeFields = z.object({
  sponsorId: z.string().uuid('sponsorId must be a valid UUID'),
  huntId: z.string().uuid('huntId must be a valid UUID'),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().optional(),
  prizeType: z.enum(PRIZE_TYPES),
  valueDescription: z.string().max(200).trim().optional(),
  expiryDate: z.string().date('Must be a valid date YYYY-MM-DD').optional(),
  termsConditions: z.string().optional(),
  imageUrl: z.string().url().max(500).optional(),
  isGrandPrize: z.boolean().default(false),
  minCluesFound: z.number().int().min(0).default(0),
  redemptionLimit: z.number().int().positive().optional(),
});

// Create: all required fields must be present
export const createPrizeSchema = prizeFields;

// Update: all fields optional
export const updatePrizeSchema = prizeFields.partial();

// Query params for GET /admin/prizes list
export const listPrizesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  huntId: z.string().uuid().optional(),
  sponsorId: z.string().uuid().optional(),
});

export type CreatePrizeBody = z.infer<typeof createPrizeSchema>;
export type UpdatePrizeBody = z.infer<typeof updatePrizeSchema>;
export type ListPrizesQuery = z.infer<typeof listPrizesQuerySchema>;
