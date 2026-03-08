// Game configuration constants shared between server and mobile app.
// Named constants prevent magic numbers scattered through the codebase.

/** Radius in meters within which a player triggers a GPS-based clue unlock */
export const CLUE_PROXIMITY_METERS = 50;

/** How often the mobile app sends GPS coordinates to the server during an active hunt (milliseconds) */
export const LOCATION_POLL_INTERVAL_MS = 5_000;

/** Reduced poll interval when app is backgrounded to save battery (milliseconds) */
export const LOCATION_POLL_INTERVAL_BACKGROUND_MS = 15_000;

/** GPS accuracy threshold — readings worse than this are ignored (meters) */
export const GPS_ACCURACY_THRESHOLD_METERS = 30;

/** Default number of points awarded for finding a clue */
export const DEFAULT_CLUE_POINTS = 10;

/** Points deducted when a player uses a hint */
export const HINT_PENALTY_POINTS = 3;

/** How long a prize redemption QR code stays valid after being generated (hours) */
export const PRIZE_REDEMPTION_EXPIRY_HOURS = 72;

/** Maximum players per team */
export const MAX_TEAM_SIZE = 4;

/** Length of team invite codes */
export const TEAM_INVITE_CODE_LENGTH = 8;
