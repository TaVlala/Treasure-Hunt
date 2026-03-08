// Shared sponsor types used by the admin panel and server.
// Keep these in sync with the Prisma schema in apps/server/prisma/schema.prisma.

export type SponsorTier = 'basic' | 'featured' | 'prize';

export type SponsorStatus = 'active' | 'paused' | 'expired';

export interface Sponsor {
  id: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  tier: SponsorTier;
  status: SponsorStatus;
  contractStart: string | null; // ISO date string YYYY-MM-DD
  contractEnd: string | null;
  monthlyFeeCents: number | null;
  notes: string | null;
  createdAt: string;
}

// Returned from list and GET /:id — includes linked clue count
export interface SponsorDetail extends Sponsor {
  clueCount: number;
}
