// Hunt completion screen — shown after the last clue is submitted.
// Fetches final session stats + leaderboard rank and displays a celebration UI.
// Receives sessionId + huntId as route params from active.tsx on hunt completion.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { playerFetch } from '@/lib/api';
import type { SessionWithProgress, LeaderboardEntry } from '@treasure-hunt/shared';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats seconds into a human-readable duration string
function fmtDuration(secs: number | null): string {
  if (secs === null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Returns a rank suffix: 1 → "1st", 2 → "2nd", 3 → "3rd", 4+ → "4th"
function rankSuffix(rank: number): string {
  if (rank === 11 || rank === 12 || rank === 13) return `${rank}th`;
  const last = rank % 10;
  if (last === 1) return `${rank}st`;
  if (last === 2) return `${rank}nd`;
  if (last === 3) return `${rank}rd`;
  return `${rank}th`;
}

// ---------------------------------------------------------------------------
// Animated score counter
// ---------------------------------------------------------------------------
function AnimatedScore({ finalScore }: { finalScore: number }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    // Listen to the animated value and update displayed integer
    const id = animVal.addListener(({ value }) => setDisplayed(Math.round(value)));
    Animated.timing(animVal, {
      toValue: finalScore,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animVal.removeListener(id);
  }, [finalScore, animVal]);

  return <Text style={styles.scoreBig}>{displayed}</Text>;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CompleteScreen() {
  const { sessionId, huntId } = useLocalSearchParams<{ sessionId: string; huntId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<SessionWithProgress | null>(null);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    void (async () => {
      try {
        // Fetch session + leaderboard in parallel
        const [sess, entries] = await Promise.all([
          playerFetch<SessionWithProgress>(`/api/v1/game/sessions/${sessionId}`),
          playerFetch<LeaderboardEntry[]>(`/api/v1/game/hunts/${huntId}/leaderboard?limit=200`),
        ]);
        setSession(sess);
        setTotalPlayers(entries.length);
        const found = entries.find((e) => e.playerId === sess.playerId);
        setMyEntry(found ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load results');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId, huntId]);

  // Trigger entrance animation once data is loaded
  useEffect(() => {
    if (!isLoading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading, error, fadeAnim, slideAnim]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Loading your results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Could not load results</Text>
          <Text style={styles.stateBody}>{error ?? 'Unknown error'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.primaryBtnText}>Back to Discover</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main completion UI
  // ---------------------------------------------------------------------------
  const allFound = session.cluesFound >= session.totalClues;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Trophy + headline */}
          <View style={styles.heroSection}>
            <Text style={styles.trophyIcon}>🏆</Text>
            <Text style={styles.headline}>Hunt Complete!</Text>
            <Text style={styles.subheadline}>
              {allFound
                ? `You found all ${session.totalClues} clues`
                : `You found ${session.cluesFound} of ${session.totalClues} clues`}
            </Text>
          </View>

          {/* Animated score */}
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Final Score</Text>
            <AnimatedScore finalScore={session.score} />
            <Text style={styles.scorePts}>points</Text>
          </View>

          {/* Stat grid */}
          <View style={styles.statGrid}>
            <StatCard
              label="Your Rank"
              value={myEntry ? rankSuffix(myEntry.rank) : '—'}
              accent={!!myEntry && myEntry.rank <= 3}
            />
            <StatCard
              label="Players"
              value={totalPlayers > 0 ? String(totalPlayers) : '—'}
            />
            <StatCard
              label="Time"
              value={fmtDuration(session.timeTakenSecs)}
            />
            <StatCard
              label="Clues Found"
              value={`${session.cluesFound}/${session.totalClues}`}
              accent={allFound}
            />
          </View>

          {/* Rank context banner */}
          {myEntry && (
            <View style={[
              styles.rankBanner,
              myEntry.rank === 1 && styles.rankBannerGold,
            ]}>
              <Text style={styles.rankBannerText}>
                {myEntry.rank === 1
                  ? '🥇 You topped the leaderboard!'
                  : myEntry.rank <= 3
                    ? `🎉 You're in the top 3 — ${rankSuffix(myEntry.rank)} place!`
                    : `You ranked ${rankSuffix(myEntry.rank)} out of ${totalPlayers} players`}
              </Text>
            </View>
          )}

          {/* CTA buttons */}
          <View style={styles.btnStack}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Back to Discover</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() =>
                router.push(
                  `/hunt/${huntId}/leaderboard?sessionId=${sessionId}&playerId=${session.playerId}`,
                )
              }
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>View Full Leaderboard</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },

  heroSection: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  trophyIcon: { fontSize: 72 },
  headline: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subheadline: { color: MUTED, fontSize: 16, textAlign: 'center', lineHeight: 22 },

  scoreSection: {
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT + '44',
    paddingVertical: 28,
    marginBottom: 20,
  },
  scoreLabel: { color: ACCENT, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  scoreBig: { color: TEXT, fontSize: 80, fontWeight: '800', letterSpacing: -4, lineHeight: 84 },
  scorePts: { color: MUTED, fontSize: 16, fontWeight: '600', marginTop: 2 },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statCardAccent: { borderColor: ACCENT + '55', backgroundColor: ACCENT + '0d' },
  statValue: { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statValueAccent: { color: ACCENT },
  statLabel: { color: MUTED, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  rankBanner: {
    backgroundColor: SURFACE2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'center',
    marginBottom: 28,
  },
  rankBannerGold: { backgroundColor: ACCENT + '18', borderColor: ACCENT + '55' },
  rankBannerText: { color: TEXT, fontSize: 15, fontWeight: '700', textAlign: 'center' },

  btnStack: { gap: 12 },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  secondaryBtn: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnText: { color: TEXT, fontSize: 15, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: MUTED, fontSize: 14, marginTop: 12 },
  stateIcon: { fontSize: 40, marginBottom: 14 },
  stateTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  stateBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});
