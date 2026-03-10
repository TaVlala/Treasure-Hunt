// Hunt discovery screen — shows all ACTIVE hunts as a scrollable card list.
// Fetches from GET /api/v1/player/hunts; supports pull-to-refresh and city filter.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { playerFetch } from '@/lib/api';
import type { Hunt, PaginatedData } from '@treasure-hunt/shared';

// Hunt as returned by /api/v1/player/hunts — includes server-side clue count
type HuntWithCount = Hunt & { clueCount: number };

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
const RED = '#ef4444';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Maps difficulty string to a short display label + color
function difficultyMeta(d: Hunt['difficulty']): { label: string; color: string } {
  switch (d) {
    case 'easy':   return { label: 'Easy',   color: '#22c55e' };
    case 'medium': return { label: 'Medium', color: ACCENT };
    case 'hard':   return { label: 'Hard',   color: '#ef4444' };
  }
}

// Formats ticket price for display
function priceLabel(hunt: HuntWithCount): string {
  if (hunt.huntType === 'free') return 'FREE';
  if (hunt.ticketPriceCents == null) return 'PAID';
  const amount = (hunt.ticketPriceCents / 100).toFixed(2);
  return `${hunt.currency} ${amount}`;
}

// Converts a theme string to a readable tag
function themeLabel(theme: Hunt['theme']): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HuntCard({ hunt, onPress }: { hunt: HuntWithCount; onPress: () => void }) {
  const diff = difficultyMeta(hunt.difficulty);
  const isFree = hunt.huntType === 'free';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Thumbnail / cover image */}
      {hunt.thumbnailUrl ? (
        <Image source={{ uri: hunt.thumbnailUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImagePlaceholderText}>🗺️</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        {/* Top row: city + price badge */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardCity}>{hunt.city}{hunt.region ? `, ${hunt.region}` : ''}</Text>
          <View style={[styles.badge, isFree ? styles.badgeFree : styles.badgePaid]}>
            <Text style={[styles.badgeText, isFree ? styles.badgeFreeText : styles.badgePaidText]}>
              {priceLabel(hunt)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{hunt.title}</Text>

        {/* Description */}
        <Text style={styles.cardDesc} numberOfLines={2}>{hunt.description}</Text>

        {/* Bottom row: tags */}
        <View style={styles.cardFooter}>
          {/* Difficulty */}
          <View style={[styles.tag, { borderColor: diff.color + '55' }]}>
            <View style={[styles.tagDot, { backgroundColor: diff.color }]} />
            <Text style={[styles.tagText, { color: diff.color }]}>{diff.label}</Text>
          </View>

          {/* Theme */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{themeLabel(hunt.theme)}</Text>
          </View>

          {/* Clue count */}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{hunt.clueCount} clue{hunt.clueCount !== 1 ? 's' : ''}</Text>
          </View>

          {/* Time limit if set */}
          {hunt.timeLimitMinutes != null && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{hunt.timeLimitMinutes}m</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Skeleton placeholder card shown during initial load
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.cardImagePlaceholder, styles.skeleton]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: '40%', height: 12, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 18, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [hunts, setHunts] = useState<HuntWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  // Fetches the hunt list; used on mount and pull-to-refresh
  const fetchHunts = useCallback(async (city?: string) => {
    try {
      setError(null);
      const path = city?.trim()
        ? `/api/v1/player/hunts?city=${encodeURIComponent(city.trim())}`
        : '/api/v1/player/hunts';
      const data = await playerFetch<PaginatedData<HuntWithCount>>(path);
      setHunts(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hunts');
    }
  }, []);

  // Initial load
  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await fetchHunts();
      setIsLoading(false);
    })();
  }, [fetchHunts]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHunts(cityFilter);
    setIsRefreshing(false);
  }, [fetchHunts, cityFilter]);

  // Search submit — apply city filter
  const onSearch = useCallback(async () => {
    setCityFilter(searchText);
    setIsLoading(true);
    await fetchHunts(searchText);
    setIsLoading(false);
  }, [fetchHunts, searchText]);

  // Clear city filter
  const onClearSearch = useCallback(async () => {
    setSearchText('');
    setCityFilter('');
    setIsLoading(true);
    await fetchHunts('');
    setIsLoading(false);
  }, [fetchHunts]);

  // Navigate to the hunt detail screen
  const onHuntPress = useCallback((hunt: HuntWithCount) => {
    router.push(`/hunt/${hunt.id}`);
  }, [router]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandLabel}>TREASURE HUNT</Text>
          <Text style={styles.greeting}>Hey, {user?.displayName ?? 'Explorer'}</Text>
        </View>
        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by city..."
          placeholderTextColor={MUTED}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => void onSearch()}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {cityFilter ? (
          <TouchableOpacity style={styles.searchClear} onPress={() => void onClearSearch()}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.searchBtn} onPress={() => void onSearch()}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active filter chip */}
      {cityFilter ? (
        <View style={styles.filterChipRow}>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>📍 {cityFilter}</Text>
          </View>
        </View>
      ) : null}

      {/* Content */}
      {isLoading ? (
        // Loading skeletons
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        // Error state
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void fetchHunts(cityFilter)}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : hunts.length === 0 ? (
        // Empty state
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>
            {cityFilter ? `No hunts in "${cityFilter}"` : 'No hunts available'}
          </Text>
          <Text style={styles.emptyBody}>
            {cityFilter
              ? 'Try a different city or clear the filter.'
              : 'Check back soon — new hunts are added regularly.'}
          </Text>
          {cityFilter ? (
            <TouchableOpacity style={styles.retryBtn} onPress={() => void onClearSearch()}>
              <Text style={styles.retryText}>Clear Filter</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        // Hunt list
        <FlatList
          data={hunts}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <HuntCard hunt={item} onPress={() => onHuntPress(item)} />
          )}
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
              {hunts.length} {hunts.length === 1 ? 'hunt' : 'hunts'} available
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
  greeting: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  logoutText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
  },
  searchBtn: {
    height: 42,
    paddingHorizontal: 18,
    backgroundColor: ACCENT,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  searchClear: {
    height: 42,
    paddingHorizontal: 18,
    backgroundColor: SURFACE2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },

  // Filter chip
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  filterChip: {
    backgroundColor: ACCENT_DIM,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  filterChipText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600',
  },

  // List
  listContent: {
    padding: 16,
    gap: 14,
  },
  listHeader: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  // Hunt card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 40,
    opacity: 0.4,
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCity: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  cardDesc: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  // Badges (free / paid)
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeFree: {
    backgroundColor: GREEN + '22',
    borderWidth: 1,
    borderColor: GREEN + '55',
  },
  badgePaid: {
    backgroundColor: ACCENT + '22',
    borderWidth: 1,
    borderColor: ACCENT + '55',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeFreeText: { color: GREEN },
  badgePaidText: { color: ACCENT },

  // Small info tags
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACE2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  tagText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },

  // Skeleton
  skeleton: {
    backgroundColor: SURFACE2,
  },
  skeletonLine: {
    backgroundColor: SURFACE2,
    borderRadius: 4,
    marginBottom: 6,
  },

  // Center states (error / empty)
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
    letterSpacing: -0.3,
  },
  errorBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptyBody: {
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
