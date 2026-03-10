// Active hunt screen — live GPS tracking toward the current clue.
// Receives sessionId + huntId as search params (set by the detail screen on join).
// Uses expo-location for real-time position; calculates distance client-side.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { playerFetch } from '@/lib/api';
import type {
  Clue,
  SessionWithProgress,
  SubmitClueResult,
} from '@treasure-hunt/shared';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const BG = '#0a0a0a';
const SURFACE = '#141414';
const SURFACE2 = '#1c1c1c';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';
const GREEN = '#22c55e';
const RED = '#ef4444';

// ---------------------------------------------------------------------------
// Haversine distance in metres — mirrors the server fallback calculation
// ---------------------------------------------------------------------------
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Compass bearing from player to clue (degrees 0–360, 0 = north)
// ---------------------------------------------------------------------------
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Converts bearing degrees to a cardinal direction label
function cardinalLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? 'N';
}

// Formats distance for display (switches to km above 1000 m)
function fmtDistance(meters: number): { value: string; unit: string } {
  if (meters >= 1000) {
    return { value: (meters / 1000).toFixed(1), unit: 'km' };
  }
  return { value: Math.round(meters).toString(), unit: 'm' };
}

// Returns a color based on how close the player is (green < 50m, amber < 200m, red otherwise)
function proximityColor(distMeters: number, radiusMeters: number): string {
  if (distMeters <= radiusMeters) return GREEN;
  if (distMeters <= radiusMeters * 3) return ACCENT;
  return MUTED;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Animated pulsing ring — scales from 0.8 to 1 in a loop
function ProximityRing({
  distanceMeters,
  radiusMeters,
}: {
  distanceMeters: number | null;
  radiusMeters: number;
}) {
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const within = distanceMeters !== null && distanceMeters <= radiusMeters;
  const ringColor = distanceMeters !== null
    ? proximityColor(distanceMeters, radiusMeters)
    : BORDER;

  // Ring size shrinks logarithmically as the player gets closer
  const ringSize = distanceMeters === null
    ? 180
    : Math.max(80, Math.min(200, 80 + (distanceMeters / radiusMeters) * 120));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: ringColor,
          transform: [{ scale: pulse }],
          opacity: within ? 1 : 0.7,
        },
      ]}
    >
      {/* Inner dot */}
      <View style={[styles.ringDot, { backgroundColor: ringColor }]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ActiveHuntScreen() {
  const { sessionId, huntId } = useLocalSearchParams<{ sessionId: string; huntId: string }>();
  const router = useRouter();

  // Session + clue state
  const [session, setSession] = useState<SessionWithProgress | null>(null);
  const [currentClue, setCurrentClue] = useState<Clue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GPS state
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  // ---------------------------------------------------------------------------
  // Load session + current clue on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      try {
        const data = await playerFetch<SessionWithProgress>(`/api/v1/game/sessions/${sessionId}`);
        setSession(data);

        // The current clue is the one with status 'unlocked'
        const unlockedProgress = data.progress.find((p) => p.status === 'unlocked');
        if (!unlockedProgress) {
          // All clues found — hunt already complete
          setCurrentClue(null);
        } else {
          // Fetch full clue detail from the player endpoint
          const clue = await playerFetch<Clue>(
            `/api/v1/player/hunts/${huntId}/clues/${unlockedProgress.clueId}`,
          ).catch(() => null);
          setCurrentClue(clue);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId, huntId]);

  // ---------------------------------------------------------------------------
  // GPS location tracking
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationGranted(false);
        return;
      }
      setLocationGranted(true);
    })();
  }, []);

  // Start watching position once we have both permission and a clue
  useEffect(() => {
    if (!locationGranted || !currentClue) return;

    void (async () => {
      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 3, // update every 3 metres of movement
          timeInterval: 2000,
        },
        (loc) => {
          const dist = haversineMeters(
            loc.coords.latitude,
            loc.coords.longitude,
            currentClue.latitude,
            currentClue.longitude,
          );
          setDistanceMeters(dist);
        },
      );
    })();

    return () => {
      locationSub.current?.remove();
    };
  }, [locationGranted, currentClue]);

  // ---------------------------------------------------------------------------
  // Submit clue as found (GPS method)
  // ---------------------------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (!currentClue || !session) return;
    setIsSubmitting(true);
    try {
      const result = await playerFetch<SubmitClueResult>(
        `/api/v1/game/sessions/${sessionId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ clueId: currentClue.id, method: 'gps' }),
        },
      );

      if (result.huntComplete) {
        // Hunt finished — navigate back to discover with celebration
        Alert.alert(
          '🎉 Hunt Complete!',
          `You found all ${result.session.totalClues} clues!\nFinal score: ${result.session.score} points`,
          [
            {
              text: 'Awesome!',
              onPress: () => router.replace('/(tabs)'),
            },
          ],
        );
        return;
      }

      // Move to next clue
      setSession(result.session);
      setCurrentClue(result.nextClue);
      setDistanceMeters(null); // reset distance until next location update
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Submit failed', [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentClue, session, sessionId, router]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Loading hunt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.back()}>
            <Text style={styles.accentBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Location permission denied
  // ---------------------------------------------------------------------------
  if (locationGranted === false) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>📍</Text>
          <Text style={styles.errorTitle}>Location required</Text>
          <Text style={styles.errorBody}>
            Treasure Hunt needs your location to find nearby clues. Please enable it in
            Settings and reopen the hunt.
          </Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.back()}>
            <Text style={styles.accentBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // No current clue (all found / unexpected state)
  // ---------------------------------------------------------------------------
  if (!currentClue || !session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>🎉</Text>
          <Text style={styles.errorTitle}>Hunt Complete!</Text>
          <Text style={styles.errorBody}>All clues have been found.</Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.accentBtnText}>Back to Discover</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main hunt UI
  // ---------------------------------------------------------------------------
  const withinRange =
    distanceMeters !== null && distanceMeters <= currentClue.proximityRadiusMeters;
  const dist = distanceMeters !== null ? fmtDistance(distanceMeters) : null;
  const distColor =
    distanceMeters !== null
      ? proximityColor(distanceMeters, currentClue.proximityRadiusMeters)
      : MUTED;
  const clueIndex = session.progress.filter((p) => p.status === 'found').length;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            Clue {clueIndex + 1} of {session.totalClues}
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{session.score} pts</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(clueIndex / session.totalClues) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Proximity ring */}
        <View style={styles.ringContainer}>
          <ProximityRing
            distanceMeters={distanceMeters}
            radiusMeters={currentClue.proximityRadiusMeters}
          />

          {/* Distance readout */}
          {dist ? (
            <View style={styles.distanceBlock}>
              <Text style={[styles.distanceValue, { color: distColor }]}>{dist.value}</Text>
              <Text style={[styles.distanceUnit, { color: distColor }]}>{dist.unit}</Text>
            </View>
          ) : (
            <View style={styles.distanceBlock}>
              <ActivityIndicator color={MUTED} size="small" />
              <Text style={styles.gpsLabel}>Getting GPS...</Text>
            </View>
          )}

          {/* Radius label */}
          <Text style={styles.radiusLabel}>
            Within {currentClue.proximityRadiusMeters}m to unlock
          </Text>
        </View>

        {/* Status banner */}
        {withinRange && (
          <View style={styles.inRangeBanner}>
            <Text style={styles.inRangeText}>✓ You're in range!</Text>
          </View>
        )}

        {/* Clue card */}
        <View style={styles.clueCard}>
          <View style={styles.clueCardHeader}>
            <View style={styles.clueTypeTag}>
              <Text style={styles.clueTypeText}>{currentClue.clueType.replace('_', ' ')}</Text>
            </View>
            {currentClue.isBonus && (
              <View style={styles.bonusTag}>
                <Text style={styles.bonusText}>BONUS +{currentClue.points}</Text>
              </View>
            )}
          </View>

          <Text style={styles.clueTitle}>{currentClue.title}</Text>
          <Text style={styles.clueDesc}>{currentClue.description}</Text>

          {currentClue.unlockMessage && withinRange && (
            <View style={styles.unlockMsg}>
              <Text style={styles.unlockMsgText}>💡 {currentClue.unlockMessage}</Text>
            </View>
          )}
        </View>

        {/* Hint */}
        {currentClue.hintText && (
          <TouchableOpacity style={styles.hintCard}>
            <Text style={styles.hintLabel}>Tap to reveal hint (−5 pts)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Submit CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!withinRange || isSubmitting) && styles.submitBtnDisabled,
          ]}
          onPress={() => void onSubmit()}
          disabled={!withinRange || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={withinRange ? '#000' : MUTED} />
          ) : (
            <Text style={[styles.submitText, !withinRange && styles.submitTextDisabled]}>
              {withinRange ? "I'm Here! 📍" : `${dist ? `${dist.value} ${dist.unit} away` : 'Locating...'}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  backText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  progressPill: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: ACCENT + '22',
    borderWidth: 1,
    borderColor: ACCENT + '55',
  },
  scoreText: { color: ACCENT, fontSize: 12, fontWeight: '700' },

  // Progress bar
  progressBarTrack: {
    height: 3,
    backgroundColor: SURFACE2,
    marginHorizontal: 0,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: ACCENT,
  },

  // Proximity ring
  ringContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distanceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  distanceValue: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 56,
  },
  distanceUnit: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  gpsLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  radiusLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '500',
  },

  // In-range banner
  inRangeBanner: {
    backgroundColor: GREEN + '22',
    borderWidth: 1,
    borderColor: GREEN + '55',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  inRangeText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },

  // Clue card
  clueCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  clueCardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  clueTypeTag: {
    backgroundColor: SURFACE2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clueTypeText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bonusTag: {
    backgroundColor: ACCENT + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: ACCENT + '55',
  },
  bonusText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
  },
  clueTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  clueDesc: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
  },
  unlockMsg: {
    marginTop: 12,
    backgroundColor: ACCENT + '18',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: ACCENT + '44',
  },
  unlockMsgText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Hint card
  hintCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  hintLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer submit button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  submitText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  submitTextDisabled: {
    color: MUTED,
  },

  // Center states
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 12,
  },
  errorIcon: { fontSize: 40, marginBottom: 14 },
  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  errorBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  accentBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  accentBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});
