// Leaderboard screen — shows top players for a hunt during or after an active session.
// Receives huntId, sessionId, playerId (current player) as route params for row highlighting.
// Calls GET /api/v1/game/hunts/:huntId/leaderboard (requires auth).

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { playerFetch } from '@/lib/api';
import type { LeaderboardEntry } from '@treasure-hunt/shared';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const BG = '#0a0a0a';
const SURFACE = '#141414';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats seconds into "mm:ss" or "h:mm:ss" for the time column
function fmtTime(secs: number | null): string {
  if (secs === null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Rank medal emoji for top 3 positions
function rankBadge(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------
function LeaderboardRow({
  entry,
  isCurrentPlayer,
}: {
  entry: LeaderboardEntry;
  isCurrentPlayer: boolean;
}) {
  return (
    <View style={[styles.row, isCurrentPlayer && styles.rowHighlight]}>
      <Text style={[styles.rankText, entry.rank <= 3 && styles.rankMedal]}>
        {rankBadge(entry.rank)}
      </Text>
      <View style={styles.rowMain}>
        <Text style={[styles.playerName, isCurrentPlayer && styles.playerNameHighlight]} numberOfLines={1}>
          {entry.displayName}
          {isCurrentPlayer ? ' (you)' : ''}
        </Text>
        <Text style={styles.clueCount}>
          {entry.cluesFound}/{entry.totalClues} clues
          {entry.completedAt ? ' · done' : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.scoreValue, isCurrentPlayer && styles.scoreHighlight]}>
          {entry.score}
        </Text>
        <Text style={styles.scoreLabel}>pts</Text>
        {entry.timeTakenSecs !== null && (
          <Text style={styles.timeValue}>{fmtTime(entry.timeTakenSecs)}</Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LeaderboardScreen() {
  const { huntId, sessionId, playerId } = useLocalSearchParams<{
    huntId: string;
    sessionId: string;
    playerId: string;
  }>();
  const router = useRouter();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard entries
  const load = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const data = await playerFetch<LeaderboardEntry[]>(
        `/api/v1/game/hunts/${huntId}/leaderboard?limit=50`,
      );
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [huntId]);

  useEffect(() => { void load(); }, [load]);

  // Find the current player's rank for the sticky banner
  const myEntry = entries.find((e) => e.playerId === playerId);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Loading scores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Could not load</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Current player sticky banner */}
      {myEntry && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankLabel}>Your rank</Text>
          <Text style={styles.myRankValue}>{rankBadge(myEntry.rank)}</Text>
          <Text style={styles.myRankScore}>{myEntry.score} pts</Text>
        </View>
      )}

      {/* Column labels */}
      <View style={styles.colHeaders}>
        <Text style={[styles.colLabel, { flex: 0, width: 40 }]}>Rank</Text>
        <Text style={[styles.colLabel, { flex: 1 }]}>Player</Text>
        <Text style={[styles.colLabel, { textAlign: 'right', width: 80 }]}>Score</Text>
      </View>

      {/* List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.playerId}
        renderItem={({ item }) => (
          <LeaderboardRow entry={item} isCurrentPlayer={item.playerId === playerId} />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.stateIcon}>📋</Text>
            <Text style={styles.stateTitle}>No scores yet</Text>
            <Text style={styles.stateBody}>Be the first to complete the hunt!</Text>
          </View>
        }
        contentContainerStyle={entries.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  backText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  title: { flex: 1, color: TEXT, fontSize: 18, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  headerSpacer: { width: 60 }, // balances back button

  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT + '18',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ACCENT + '44',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  myRankLabel: { color: ACCENT, fontSize: 12, fontWeight: '600', flex: 1 },
  myRankValue: { color: TEXT, fontSize: 18, fontWeight: '800' },
  myRankScore: { color: ACCENT, fontSize: 14, fontWeight: '700' },

  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  colLabel: { color: MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  rowHighlight: { backgroundColor: ACCENT + '0d' },
  rankText: { width: 28, color: MUTED, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rankMedal: { fontSize: 18 },
  rowMain: { flex: 1, gap: 2 },
  playerName: { color: TEXT, fontSize: 14, fontWeight: '700' },
  playerNameHighlight: { color: ACCENT },
  clueCount: { color: MUTED, fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  scoreValue: { color: TEXT, fontSize: 16, fontWeight: '800' },
  scoreHighlight: { color: ACCENT },
  scoreLabel: { color: MUTED, fontSize: 10, fontWeight: '600' },
  timeValue: { color: MUTED, fontSize: 11 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyList: { flex: 1 },
  loadingText: { color: MUTED, fontSize: 14, marginTop: 12 },
  stateIcon: { fontSize: 40, marginBottom: 14 },
  stateTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  stateBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
