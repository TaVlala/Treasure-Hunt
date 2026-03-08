// Shared game / player-session types used across mobile, admin, and server.

import type { Clue } from './hunt';

export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'timed_out';
export type ProgressStatus = 'locked' | 'unlocked' | 'found' | 'skipped';
export type FoundMethod = 'gps' | 'qr_code' | 'answer';

// Result returned by POST /api/v1/game/proximity-check
export interface ProximityCheckResult {
  withinRange: boolean;
  distanceMeters: number;
  radiusMeters: number;
}

// Active game session for a player in a hunt
export interface GameSession {
  id: string;
  huntId: string;
  playerId: string;
  teamId: string | null;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  score: number;
  cluesFound: number;
  totalClues: number;
  timeTakenSecs: number | null;
}

// Per-clue progress entry within a session
export interface ClueProgress {
  clueId: string;
  status: ProgressStatus;
  foundAt: string | null;
  pointsEarned: number;
  hintUsed: boolean;
}

// Result returned by POST /api/v1/game/sessions (join hunt)
export interface JoinHuntResult {
  session: GameSession;
  currentClue: Clue | null;
}
