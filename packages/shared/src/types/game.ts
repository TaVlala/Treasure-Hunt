// Shared game / player-session types used across mobile, admin, and server.

// Result returned by POST /api/v1/game/proximity-check
export interface ProximityCheckResult {
  withinRange: boolean;
  distanceMeters: number;
  radiusMeters: number;
}
