// Zod validation schemas for sponsor create, update, and list request bodies.
// Enum values use lowercase (matching shared types) and are uppercased before DB writes.

import { z } from 'zod';

// Base sponsor fields — shared between create and update schemas
const sponsorFields = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(200).trim(),
  contactName: z.string().max(100).trim().optional(),
  contactEmail: z.string().email('Invalid email address').max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  websiteUrl: z.string().url().max(500).optional(),
  logoUrl: z.string().url().max(500).optional(),
  description: z.string().optional(),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  tier: z.enum(['basic', 'featured', 'prize']).default('basic'),
  contractStart: z.string().date('Must be a valid date YYYY-MM-DD').optional(),
  contractEnd: z.string().date('Must be a valid date YYYY-MM-DD').optional(),
  monthlyFeeCents: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// Create: all required fields must be present
export const createSponsorSchema = sponsorFields;

// Update: all fields optional; status can also be changed by admin
export const updateSponsorSchema = sponsorFields.partial().extend({
  status: z.enum(['active', 'paused', 'expired']).optional(),
});

// Query params for GET /admin/sponsors list
export const listSponsorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tier: z.enum(['basic', 'featured', 'prize']).optional(),
  status: z.enum(['active', 'paused', 'expired']).optional(),
});

export type CreateSponsorBody = z.infer<typeof createSponsorSchema>;
export type UpdateSponsorBody = z.infer<typeof updateSponsorSchema>;
export type ListSponsorsQuery = z.infer<typeof listSponsorsQuerySchema>;
