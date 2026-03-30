// huntCache — offline bundle cache for active hunt clues.
// Stores the full clue list keyed by huntId in AsyncStorage.
// Stale after CACHE_TTL_MS (24 hours).
// v2: ClueWithSponsor from @treasure-hunt/shared already includes unlockType,
// locationHidden, and contents fields. Optional chaining in consumers ensures
// old cached bundles (missing v2 fields) degrade gracefully.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClueWithSponsor } from '@treasure-hunt/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Returns the AsyncStorage key for a given huntId
const CACHE_KEY = (huntId: string): string => `hunt_bundle_${huntId}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CachedBundle = {
  clues: ClueWithSponsor[];
  cachedAt: number;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Persists a clue bundle for the given hunt to AsyncStorage
export async function saveBundle(huntId: string, clues: ClueWithSponsor[]): Promise<void> {
  const bundle: CachedBundle = { clues, cachedAt: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY(huntId), JSON.stringify(bundle));
}

// Returns cached clues for the given hunt, or null if missing or stale (> 24h)
export async function loadBundle(huntId: string): Promise<ClueWithSponsor[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY(huntId));
  if (!raw) return null;

  const bundle = JSON.parse(raw) as CachedBundle;
  if (Date.now() - bundle.cachedAt > CACHE_TTL_MS) {
    await AsyncStorage.removeItem(CACHE_KEY(huntId));
    return null;
  }

  return bundle.clues;
}

// Removes the cached bundle for the given hunt from AsyncStorage
export async function clearBundle(huntId: string): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY(huntId));
}
