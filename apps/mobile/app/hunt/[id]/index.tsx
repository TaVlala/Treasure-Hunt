// Hunt detail screen — shows full info for a single active hunt and lets the player join or resume.
// Navigated to by pushing /hunt/:id from the discover tab.
// On join/resume navigates to /hunt/:id/active with the session ID.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { playerFetch } from '@/lib/api';
import type { Hunt, HuntDetail, JoinHuntResult } from '@treasure-hunt/shared';

type HuntWithCount = HuntDetail & { clueCount: number };
type ExistingSession = { id: string; cluesFound: number; totalClues: number; score: number };

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const BG = '#0a0a0a';
const SURFACE = '#141414';
const SURFACE2 = '#1c1c1c';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const ACCENT_DIM = '#78450a';
const TEXT = '#ffffff';
const MUTED = '#888888';
const GREEN = '#22c55e';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Returns difficulty display metadata
function difficultyMeta(d: Hunt['difficulty']): { label: string; color: string } {
  switch (d) {
    case 'easy':   return { label: 'Easy',   color: GREEN };
    case 'medium': return { label: 'Medium', color: ACCENT };
    case 'hard':   return { label: 'Hard',   color: '#ef4444' };
  }
}

// Formats ticket price or FREE
function priceLabel(hunt: HuntWithCount): string {
  if (hunt.huntType === 'free') return 'Free to play';
  if (hunt.ticketPriceCents == null) return 'Paid';
  const amount = (hunt.ticketPriceCents / 100).toFixed(2);
  return `${hunt.currency} ${amount}`;
}

// Formats a date ISO string to a readable short date
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Formats a team mode value for display
function teamModeLabel(mode: Hunt['teamMode']): string {
  switch (mode) {
    case 'solo': return 'Solo only';
    case 'team': return 'Teams only';
    case 'both': return 'Solo or team';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// A single info row: icon + label + value
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HuntDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [hunt, setHunt] = useState<HuntWithCount | null>(null);
  const [existingSession, setExistingSession] = useState<ExistingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hunt detail + check for an existing active session in parallel
  useEffect(() => {
    void (async () => {
      try {
        const [data, session] = await Promise.all([
          playerFetch<HuntWithCount>(`/api/v1/player/hunts/${id}`),
          playerFetch<ExistingSession>(`/api/v1/player/hunts/${id}/my-session`).catch(() => null),
        ]);
        setHunt(data);
        setExistingSession(session);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load hunt');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // Resume an existing session — navigate straight to active screen
  const onResume = useCallback(() => {
    if (!existingSession || !hunt) return;
    router.replace(`/hunt/${hunt.id}/active?sessionId=${existingSession.id}&huntId=${hunt.id}`);
  }, [existingSession, hunt, router]);

  // Join the hunt — creates a new game session
  const onJoin = useCallback(async () => {
    if (!hunt) return;
    setIsJoining(true);
    try {
      const result = await playerFetch<JoinHuntResult>('/api/v1/game/sessions', {
        method: 'POST',
        body: JSON.stringify({ huntId: hunt.id }),
      });
      router.replace(`/hunt/${hunt.id}/active?sessionId=${result.session.id}&huntId=${hunt.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join hunt';
      Alert.alert('Could not join', msg, [{ text: 'OK' }]);
    } finally {
      setIsJoining(false);
    }
  }, [hunt]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.backRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !hunt) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.backRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to load hunt</Text>
          <Text style={styles.errorBody}>{error ?? 'Hunt not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const diff = difficultyMeta(hunt.difficulty);
  const isFree = hunt.huntType === 'free';

  return (
    <SafeAreaView style={styles.root}>
      {/* Fixed back button over the cover image */}
      <View style={styles.backRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover image / placeholder */}
        {hunt.coverImageUrl ? (
          <Image
            source={{ uri: hunt.coverImageUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>🗺️</Text>
          </View>
        )}

        {/* Main content card */}
        <View style={styles.content}>
          {/* City + badges */}
          <View style={styles.topRow}>
            <Text style={styles.city}>
              {hunt.city}{hunt.region ? `, ${hunt.region}` : ''}
            </Text>
            <View style={styles.badges}>
              {/* Difficulty badge */}
              <View style={[styles.badge, { borderColor: diff.color + '55', backgroundColor: diff.color + '18' }]}>
                <View style={[styles.badgeDot, { backgroundColor: diff.color }]} />
                <Text style={[styles.badgeText, { color: diff.color }]}>{diff.label}</Text>
              </View>
              {/* Free / paid badge */}
              <View style={[styles.badge, isFree
                ? { borderColor: GREEN + '55', backgroundColor: GREEN + '18' }
                : { borderColor: ACCENT + '55', backgroundColor: ACCENT + '18' }
              ]}>
                <Text style={[styles.badgeText, { color: isFree ? GREEN : ACCENT }]}>
                  {isFree ? 'FREE' : 'PAID'}
                </Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{hunt.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{hunt.description}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <InfoRow icon="🧩" label="Clues" value={`${hunt.clueCount} clue${hunt.clueCount !== 1 ? 's' : ''}`} />
            <InfoRow icon="💰" label="Price" value={priceLabel(hunt)} />
            <InfoRow icon="👥" label="Teams" value={teamModeLabel(hunt.teamMode)} />
            {hunt.timeLimitMinutes != null && (
              <InfoRow icon="⏱" label="Time limit" value={`${hunt.timeLimitMinutes} minutes`} />
            )}
            {hunt.maxPlayers != null && (
              <InfoRow icon="🎯" label="Max players" value={String(hunt.maxPlayers)} />
            )}
            {hunt.startsAt && (
              <InfoRow icon="📅" label="Starts" value={fmtDate(hunt.startsAt)} />
            )}
            {hunt.endsAt && (
              <InfoRow icon="🏁" label="Ends" value={fmtDate(hunt.endsAt)} />
            )}
          </View>

          {/* Map center hint */}
          <View style={styles.mapHint}>
            <Text style={styles.mapHintIcon}>📍</Text>
            <Text style={styles.mapHintText}>
              Starting area: {hunt.centerLat.toFixed(4)}, {hunt.centerLng.toFixed(4)}
            </Text>
          </View>

          {/* Sponsor / whitelabel branding if set */}
          {hunt.whitelabelName && (
            <View style={styles.sponsorBanner}>
              {hunt.whitelabelLogoUrl && (
                <Image
                  source={{ uri: hunt.whitelabelLogoUrl }}
                  style={styles.sponsorLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.sponsorText}>Presented by {hunt.whitelabelName}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom CTA — Resume or Join */}
      <View style={styles.footer}>
        {existingSession ? (
          <>
            <View style={styles.resumeBanner}>
              <Text style={styles.resumeBannerText}>
                Hunt in progress — {existingSession.cluesFound}/{existingSession.totalClues} clues · {existingSession.score} pts
              </Text>
            </View>
            <TouchableOpacity style={styles.joinBtn} onPress={onResume} activeOpacity={0.8}>
              <Text style={styles.joinText}>Resume Hunt →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, isJoining && styles.joinBtnDisabled]}
            onPress={() => void onJoin()}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.joinText}>
                {isFree ? 'Start Hunt — Free' : `Join Hunt · ${priceLabel(hunt)}`}
              </Text>
            )}
          </TouchableOpacity>
        )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Back button — floats over cover image
  backRow: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: BORDER,
  },
  backText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
  },

  // Cover image
  cover: {
    width: '100%',
    height: 240,
  },
  coverPlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 64,
    opacity: 0.3,
  },

  // Content card below cover
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  city: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 10,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 12,
  },
  description: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 20,
  },

  // Info grid
  infoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
  },

  // Map coord hint
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SURFACE2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  mapHintIcon: { fontSize: 14 },
  mapHintText: {
    color: MUTED,
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Sponsor banner
  sponsorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ACCENT_DIM,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: ACCENT + '44',
  },
  sponsorLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  sponsorText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Sticky footer
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
  joinBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  resumeBanner: {
    backgroundColor: ACCENT + '18',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ACCENT + '44',
  },
  resumeBannerText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600',
  },

  // Center states
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIcon: { fontSize: 40, marginBottom: 14 },
  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});
