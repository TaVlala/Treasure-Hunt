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
  maxPlayers: number | null;
  teamMode: TeamMode;
  maxTeamSize: number;
  status: HuntStatus;
  startsAt: string | null;
  endsAt: string | null;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  whitelabelName: string | null;
  whitelabelLogoUrl: string | null;
  whitelabelColor: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
}

// Returned from GET /admin/hunts/:id — includes derived fields not on list responses
export interface HuntDetail extends Hunt {
  clueCount: number;
}

// Player-safe clue shape — does NOT include the answer field
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
  createdAt: string;
}

// Admin-only clue shape — includes the answer and linked sponsor
export interface AdminClue extends Clue {
  answer: string | null;
  sponsorId: string | null;
}

// Sponsor branding data embedded in a player-facing clue response
export interface ClueSponsor {
  businessName: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  brandedMessage: string | null;
  offerText: string | null;
  brandingColor: string | null;
  callToAction: string | null;
}

// Player clue with optional sponsor branding (GET /player/hunts/:huntId/clues/:clueId)
export interface ClueWithSponsor extends Clue {
  sponsor: ClueSponsor | null;
}

// Full offline-cacheable bundle for a hunt — returned by GET /player/hunts/:huntId/bundle
export interface HuntBundle {
  hunt: HuntDetail & { clueCount: number };
  clues: ClueWithSponsor[];
  cachedAt: string;
}

// Achievement definition (hardcoded catalogue) — id matches server lib/achievements.ts
export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

// Achievement with earned status — returned by GET /player/achievements
export type PlayerAchievement = AchievementDef & {
  earned: boolean;
  earnedAt: string | null;
};

// Full player profile response — returned by GET /player/profile
export type PlayerProfile = {
  player: { id: string; displayName: string; email: string; createdAt: string };
  stats: {
    huntsCompleted: number;
    totalPoints: number;
    totalCluesFound: number;
    achievementsEarned: number;
  };
  earnedAchievements: (AchievementDef & { earnedAt: string })[];
};
