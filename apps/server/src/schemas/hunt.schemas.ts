// Zod validation schemas for hunt create and update request bodies.
// Enum values use lowercase (matching shared types) and are uppercased before DB writes.

import { z } from 'zod';

// Reusable field definitions — shared between create and update schemas
const huntFields = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  city: z.string().min(1).max(100).trim(),
  region: z.string().max(100).trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  theme: z
    .enum(['general', 'christmas', 'halloween', 'summer', 'festival', 'custom'])
    .default('general'),
  huntType: z.enum(['free', 'paid']).default('free'),
  ticketPriceCents: z.number().int().positive().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
  timeLimitMinutes: z.number().int().positive().optional(),
  maxPlayers: z.number().int().positive().optional(),
  teamMode: z.enum(['solo', 'team', 'both']).default('both'),
  maxTeamSize: z.number().int().min(2).max(10).default(4),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  thumbnailUrl: z.string().url().max(500).optional(),
  coverImageUrl: z.string().url().max(500).optional(),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  zoomLevel: z.number().int().min(1).max(22).default(14),
  whitelabelName: z.string().max(200).trim().optional(),
  whitelabelLogoUrl: z.string().url().max(500).optional(),
  whitelabelColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex colour e.g. #FF0000')
    .optional(),
  metaTitle: z.string().max(200).trim().optional(),
  metaDescription: z.string().max(500).trim().optional(),
});

// Create: all hunt fields + optional slug (auto-generated from title if omitted)
export const createHuntSchema = huntFields.extend({
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens')
    .max(200)
    .optional(),
});

// Update: all hunt fields become optional; status can also be changed by admin
export const updateHuntSchema = huntFields.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
});

// Query params for GET /admin/hunts list — coerce strings from querystring to numbers
export const listHuntsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  city: z.string().optional(),
});

export type CreateHuntBody = z.infer<typeof createHuntSchema>;
export type UpdateHuntBody = z.infer<typeof updateHuntSchema>;
export type ListHuntsQuery = z.infer<typeof listHuntsQuerySchema>;
