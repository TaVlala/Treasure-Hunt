// Shared sponsor types used by the admin panel and server.
// Keep these in sync with the Prisma schema in apps/server/prisma/schema.prisma.

export type SponsorTier = 'basic' | 'featured' | 'prize';

export type PrizeType = 'discount' | 'free_item' | 'experience' | 'gift_card' | 'merch';

// Minimal sponsor info embedded in prize responses (player-safe)
export interface PrizeSponsor {
  id: string;
  businessName: string;
  logoUrl: string | null;
  address: string;
  websiteUrl: string | null;
}

// A prize the player has earned — returned by GET /api/v1/player/hunts/:huntId/prizes
export interface SponsorPrize {
  id: string;
  huntId: string;
  title: string;
  description: string | null;
  prizeType: PrizeType;
  valueDescription: string | null;
  expiryDate: string | null; // ISO date string YYYY-MM-DD
  termsConditions: string | null;
  imageUrl: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  sponsor: PrizeSponsor;
}

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

// Stripe recurring subscription status for a sponsor's platform fee
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing';

export interface Subscription {
  id: string;
  sponsorId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string; // ISO timestamp
  currentPeriodEnd: string;   // ISO timestamp
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}
