// Shared hunt and clue types used across mobile, admin, and server.
// Keep these in sync with the Prisma schema in apps/server/prisma/schema.prisma.

export type HuntDifficulty = 'easy' | 'medium' | 'hard';

export type HuntTheme =
  | 'general'
  | 'christmas'
  | 'halloween'
  | 'summer'
  | 'festival'
  | 'custom';

export type HuntType = 'free' | 'paid';

export type HuntStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type TeamMode = 'solo' | 'team' | 'both';

export type ClueType =
  | 'text_riddle'
  | 'image'
  | 'gps_proximity'
  | 'qr_code'
  | 'photo_challenge';

export interface Hunt {
  id: string;
  title: string;
  slug: string;
  description: string;
  city: string;
  region: string | null;
  difficulty: HuntDifficulty;
  theme: HuntTheme;
  huntType: HuntType;
  ticketPriceCents: number | null;
  currency: string;
  timeLimitMinutes: number | null;
  teamMode: TeamMode;
  status: HuntStatus;
  startsAt: string | null;
  endsAt: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  centerLat: number;
  centerLng: number;
  whitelabelName: string | null;
  whitelabelLogoUrl: string | null;
  whitelabelColor: string | null;
  createdAt: string;
}

export interface Clue {
  id: string;
  huntId: string;
  orderIndex: number;
  title: string;
  description: string;
  hintText: string | null;
  clueType: ClueType;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  proximityRadiusMeters: number;
  isBonus: boolean;
  points: number;
  unlockMessage: string | null;
}
