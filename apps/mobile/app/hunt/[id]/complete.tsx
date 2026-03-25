// Hunt completion screen — shown after the last clue is submitted.
// Fetches final session stats, leaderboard rank, and earned prizes; displays a celebration UI.
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
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { playerFetch } from '@/lib/api';
import type { SessionWithProgress, LeaderboardEntry, SponsorPrize, PrizeType } from '@treasure-hunt/shared';

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

// Confetti piece colors
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Prize type metadata
// ---------------------------------------------------------------------------
const PRIZE_TYPE_META: Record<PrizeType, { label: string; color: string }> = {
  discount: { label: 'Discount', color: '#22c55e' },
  free_item: { label: 'Free Item', color: '#3b82f6' },
  experience: { label: 'Experience', color: ACCENT },
  gift_card: { label: 'Gift Card', color: '#a855f7' },
  merch: { label: 'Merchandise', color: '#64748b' },
};

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
// Confetti piece — a single animated square/circle falling from the top
// ---------------------------------------------------------------------------
interface ConfettiPieceConfig {
  id: number;
  color: string;
  startX: number;
  endX: number;
  size: number;
  isCircle: boolean;
  delay: number;
}

function ConfettiPiece({ config }: { config: ConfettiPieceConfig }) {
  const yAnim = useRef(new Animated.Value(-20)).current;
  const xAnim = useRef(new Animated.Value(config.startX)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animation after the piece's individual delay
    const timer = setTimeout(() => {
      Animated.parallel([
        // Fall down
        Animated.timing(yAnim, {
          toValue: 700,
          duration: 2200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Drift sideways
        Animated.timing(xAnim, {
          toValue: config.endX,
          duration: 2200,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        // Spin
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Fade out in the bottom third of the fall
        Animated.sequence([
          Animated.delay(1400),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, config.delay);

    return () => clearTimeout(timer);
  }, [yAnim, xAnim, rotateAnim, opacityAnim, config.delay, config.endX]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: config.size,
        height: config.size,
        borderRadius: config.isCircle ? config.size / 2 : 2,
        backgroundColor: config.color,
        transform: [
          { translateX: xAnim },
          { translateY: yAnim },
          { rotate },
        ],
        opacity: opacityAnim,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Confetti — 20 pieces launched from the top of the screen
// ---------------------------------------------------------------------------
function Confetti() {
  const pieces = useRef<ConfettiPieceConfig[]>(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      // Spread pieces across the full screen width
      startX: (i / 20) * SCREEN_WIDTH,
      // Each piece drifts a small random amount sideways
      endX: (i / 20) * SCREEN_WIDTH + (i % 2 === 0 ? 40 : -40),
      size: i % 3 === 0 ? 8 : 6,
      isCircle: i % 4 === 0,
      // Stagger launches over 800ms so they don't all fall at once
      delay: Math.floor((i / 20) * 800),
    }))
  ).current;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    >
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} config={p} />
      ))}
    </View>
  );
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
// Prize card
// ---------------------------------------------------------------------------
function PrizeCard({
  prize,
  onClaim,
}: {
  prize: SponsorPrize;
  onClaim: (prize: SponsorPrize) => void;
}) {
  const meta = PRIZE_TYPE_META[prize.prizeType];
  const isGrand = prize.isGrandPrize;

  return (
    <View style={[styles.prizeCard, isGrand && styles.prizeCardGrand]}>
      {/* Grand prize crown banner */}
      {isGrand && (
        <View style={styles.grandBanner}>
          <Text style={styles.grandBannerText}>👑 Grand Prize</Text>
        </View>
      )}

      <View style={styles.prizeCardInner}>
        {/* Optional prize image */}
        {prize.imageUrl ? (
          <Image source={{ uri: prize.imageUrl }} style={styles.prizeImage} resizeMode="cover" />
        ) : (
          <View style={styles.prizeImagePlaceholder}>
            <Text style={styles.prizeImagePlaceholderIcon}>🎁</Text>
          </View>
        )}

        <View style={styles.prizeInfo}>
          {/* Type badge + sponsor */}
          <View style={styles.prizeTopRow}>
            <View style={[styles.prizeBadge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.prizeBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {prize.valueDescription ? (
              <Text style={styles.prizeValue}>{prize.valueDescription}</Text>
            ) : null}
          </View>

          {/* Title */}
          <Text style={styles.prizeTitle}>{prize.title}</Text>

          {/* Description */}
          {prize.description ? (
            <Text style={styles.prizeDescription} numberOfLines={2}>
              {prize.description}
            </Text>
          ) : null}

          {/* Sponsor name */}
          <Text style={styles.prizeSponsor}>📍 {prize.sponsor.businessName}</Text>

          {/* Expiry warning */}
          {prize.expiryDate ? (
            <Text style={styles.prizeExpiry}>Expires {prize.expiryDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Claim button */}
      <TouchableOpacity
        style={[styles.claimBtn, isGrand && styles.claimBtnGrand]}
        onPress={() => onClaim(prize)}
        activeOpacity={0.8}
      >
        <Text style={[styles.claimBtnText, isGrand && styles.claimBtnTextGrand]}>
          Claim Prize →
        </Text>
      </TouchableOpacity>
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
  const [prizes, setPrizes] = useState<SponsorPrize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  // Fire success haptic immediately on mount to celebrate the completion
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        // Fetch session, leaderboard, and prizes in parallel
        const [sess, entries, earnedPrizes] = await Promise.all([
          playerFetch<SessionWithProgress>(`/api/v1/game/sessions/${sessionId}`),
          playerFetch<LeaderboardEntry[]>(`/api/v1/game/hunts/${huntId}/leaderboard?limit=200`),
          playerFetch<SponsorPrize[]>(
            `/api/v1/player/hunts/${huntId}/prizes?sessionId=${sessionId}`,
          ).catch(() => [] as SponsorPrize[]), // prizes are optional — don't block on failure
        ]);
        setSession(sess);
        setTotalPlayers(entries.length);
        const found = entries.find((e) => e.playerId === sess.playerId);
        setMyEntry(found ?? null);
        setPrizes(earnedPrizes);
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

  // Navigate to the prize detail / claim screen
  function handleClaim(prize: SponsorPrize) {
    router.push(`/hunt/${huntId}/prize/${prize.id}?sessionId=${sessionId}`);
  }

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
      {/* Confetti layer — absolutely positioned, non-interactive, above everything */}
      <Confetti />

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

          {/* Prize gallery — only shown when prizes are available */}
          {prizes.length > 0 && (
            <View style={styles.prizeSection}>
              <View style={styles.prizeSectionHeader}>
                <Text style={styles.prizeSectionTitle}>🎁 Your Prizes</Text>
                <Text style={styles.prizeSectionSub}>
                  {prizes.length === 1
                    ? 'You unlocked 1 prize'
                    : `You unlocked ${prizes.length} prizes`}
                </Text>
              </View>

              {prizes.map((prize) => (
                <PrizeCard key={prize.id} prize={prize} onClaim={handleClaim} />
              ))}
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

  // Prize gallery
  prizeSection: { marginBottom: 28 },
  prizeSectionHeader: { marginBottom: 14, gap: 4 },
  prizeSectionTitle: { color: TEXT, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  prizeSectionSub: { color: MUTED, fontSize: 13 },

  prizeCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: 'hidden',
  },
  prizeCardGrand: {
    borderColor: ACCENT + '66',
    backgroundColor: ACCENT + '08',
  },

  grandBanner: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  grandBannerText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  prizeCardInner: { flexDirection: 'row', padding: 14, gap: 12 },

  prizeImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: SURFACE2 },
  prizeImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImagePlaceholderIcon: { fontSize: 28 },

  prizeInfo: { flex: 1, gap: 5 },
  prizeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  prizeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  prizeValue: { color: GREEN, fontSize: 12, fontWeight: '700' },

  prizeTitle: { color: TEXT, fontSize: 15, fontWeight: '800', letterSpacing: -0.2, lineHeight: 20 },
  prizeDescription: { color: MUTED, fontSize: 12, lineHeight: 17 },
  prizeSponsor: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 2 },
  prizeExpiry: { color: '#ef4444', fontSize: 11, fontWeight: '600' },

  claimBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: SURFACE2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  claimBtnGrand: { backgroundColor: ACCENT, borderColor: ACCENT },
  claimBtnText: { color: TEXT, fontSize: 14, fontWeight: '700' },
  claimBtnTextGrand: { color: '#000' },

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
