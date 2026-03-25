// Hunt history screen — displays the authenticated player's past game sessions.
// Fetches GET /api/v1/player/sessions; shows skeleton rows while loading,
// then a FlatList of session cards with title, date, score, clue progress,
// time taken, rank badge, and status badge.

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Animated,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { playerFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Shape returned by GET /api/v1/player/sessions
interface SessionSummary {
  id: string;
  huntId: string;
  huntTitle: string;
  status: string;
  score: number;
  startedAt: string;
  completedAt: string | null;
  cluesFound: number;
  totalClues: number;
  timeTakenSecs: number | null;
  rank: number | null;
}

// ---------------------------------------------------------------------------
// Design tokens (matches existing screens)
// ---------------------------------------------------------------------------
const BG       = '#0a0a0a';
const SURFACE  = '#141414';
const SURFACE2 = '#1c1c1c';
const BORDER   = '#242424';
const ACCENT   = '#f59e0b';
const TEXT     = '#ffffff';
const MUTED    = '#888888';
const GREEN    = '#22c55e';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats an ISO date string as a locale date e.g. "Mar 15, 2026"
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Computes a human-readable duration from startedAt → completedAt.
// Falls back to timeTakenSecs if completedAt is absent.
function fmtDuration(session: SessionSummary): string {
  if (session.timeTakenSecs !== null) {
    const total = session.timeTakenSecs;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }
  if (session.completedAt) {
    const diffSecs = Math.round(
      (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
    );
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }
  return '—';
}

// Produces the rank badge label for display
function rankLabel(rank: number | null): string {
  if (rank === null) return '';
  if (rank === 1) return '🥇 1st';
  if (rank === 2) return '🥈 2nd';
  if (rank === 3) return '🥉 3rd';
  return `#${rank}`;
}

// Returns true for a "completed" session status
function isCompleted(status: string): boolean {
  return status === 'completed';
}

// ---------------------------------------------------------------------------
// Skeleton row — animated opacity pulse shown during initial load
// ---------------------------------------------------------------------------

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    // Loop: fade between 0.35 and 0.7
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Title placeholder */}
      <View style={[styles.skeletonLine, { width: '65%', height: 18, marginBottom: 10 }]} />
      {/* Date placeholder */}
      <View style={[styles.skeletonLine, { width: '35%', height: 12, marginBottom: 10 }]} />
      {/* Stat row placeholders */}
      <View style={styles.skeletonStatRow}>
        <View style={[styles.skeletonLine, { width: 70, height: 12 }]} />
        <View style={[styles.skeletonLine, { width: 80, height: 12 }]} />
        <View style={[styles.skeletonLine, { width: 60, height: 12 }]} />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

function SessionCard({ session }: { session: SessionSummary }) {
  const completed = isCompleted(session.status);
  const rank = session.rank;
  const hasRank = rank !== null;

  return (
    <View style={styles.card}>
      {/* Top row: title + status badge */}
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {session.huntTitle}
        </Text>
        <View style={[styles.statusBadge, completed ? styles.statusBadgeCompleted : styles.statusBadgeAbandoned]}>
          <Text style={[styles.statusBadgeText, completed ? styles.statusTextCompleted : styles.statusTextAbandoned]}>
            {completed ? 'Completed' : 'Abandoned'}
          </Text>
        </View>
      </View>

      {/* Date */}
      <Text style={styles.cardDate}>{fmtDate(session.startedAt)}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Score */}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{session.score}</Text>
          <Text style={styles.statLabel}>pts</Text>
        </View>

        {/* Divider */}
        <View style={styles.statDivider} />

        {/* Clues */}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {session.cluesFound}/{session.totalClues}
          </Text>
          <Text style={styles.statLabel}>clues</Text>
        </View>

        {/* Divider */}
        <View style={styles.statDivider} />

        {/* Time */}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{fmtDuration(session)}</Text>
          <Text style={styles.statLabel}>time</Text>
        </View>

        {/* Rank badge — only shown when rank is available */}
        {hasRank && (
          <>
            <View style={styles.statDivider} />
            <View style={[
              styles.rankBadge,
              rank === 1 && styles.rankBadgeGold,
              rank === 2 && styles.rankBadgeSilver,
              rank === 3 && styles.rankBadgeBronze,
            ]}>
              <Text style={[
                styles.rankBadgeText,
                (rank <= 3) && styles.rankBadgeTextTop,
              ]}>
                {rankLabel(rank)}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetches session history from the server
  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await playerFetch<SessionSummary[]>('/api/v1/player/sessions');
      setSessions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await fetchSessions();
      setIsLoading(false);
    })();
  }, [fetchSessions]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSessions();
    setIsRefreshing(false);
  }, [fetchSessions]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandLabel}>TREASURE HUNT</Text>
        <Text style={styles.screenTitle}>Hunt History</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        // Skeleton loading state — 3 animated placeholder rows
        <View style={styles.listContent}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : error ? (
        // Error state
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateBody}>{error}</Text>
        </View>
      ) : sessions.length === 0 ? (
        // Empty state — no sessions yet
        <View style={styles.center}>
          <Text style={styles.stateIcon}>📋</Text>
          <Text style={styles.stateTitle}>No hunts played yet</Text>
          <Text style={styles.stateBody}>
            Complete your first hunt to see history here
          </Text>
        </View>
      ) : (
        // Session list
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SessionCard session={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {sessions.length} {sessions.length === 1 ? 'hunt' : 'hunts'} played
            </Text>
          }
        />
      )}
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandLabel: {
    color: ACCENT,
    fontSize: 9,
    letterSpacing: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },

  // List
  listContent: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  // Session card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  cardDate: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14,
  },

  // Status badge
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusBadgeCompleted: {
    backgroundColor: GREEN + '22',
    borderWidth: 1,
    borderColor: GREEN + '55',
  },
  statusBadgeAbandoned: {
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusTextCompleted: { color: GREEN },
  statusTextAbandoned: { color: MUTED },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 4,
  },
  statValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: BORDER,
    marginHorizontal: 4,
  },

  // Rank badge
  rankBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
    marginLeft: 4,
  },
  rankBadgeGold: {
    backgroundColor: '#f59e0b22',
    borderColor: '#f59e0b66',
  },
  rankBadgeSilver: {
    backgroundColor: '#94a3b822',
    borderColor: '#94a3b866',
  },
  rankBadgeBronze: {
    backgroundColor: '#cd7f3222',
    borderColor: '#cd7f3266',
  },
  rankBadgeText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
  },
  rankBadgeTextTop: {
    color: TEXT,
  },

  // Skeleton
  skeletonLine: {
    backgroundColor: SURFACE2,
    borderRadius: 4,
  },
  skeletonStatRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Center states (error / empty)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  stateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  stateBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
