// Player profile screen — shows stats and achievement badge grid.
// Fetches from GET /api/v1/player/profile and GET /api/v1/player/achievements.
// Uses pull-to-refresh and animated skeleton cards during initial load.

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { playerFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getTouristPrefs } from '@/lib/touristPrefs';

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
// GREEN = '#22c55e' — kept in token set but not used on this screen

// ---------------------------------------------------------------------------
// Types (local until shared types are published — backend agent builds in parallel)
// ---------------------------------------------------------------------------

type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
};

type PlayerProfile = {
  player: { id: string; displayName: string; email: string; createdAt: string };
  stats: {
    huntsCompleted: number;
    totalPoints: number;
    totalCluesFound: number;
    achievementsEarned: number;
    tier?: {
      label: string;
      icon: string;
      color: string;
      minPoints: number;
    };
  };
  earnedAchievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats an ISO date string as "Member since Mon YYYY"
function fmtMemberSince(iso: string): string {
  return `Member since ${new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`;
}

// Formats an ISO date string as a short locale date e.g. "Mar 15, 2026"
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Skeleton card — animated opacity pulse shown during initial load
// ---------------------------------------------------------------------------

function SkeletonBadge() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.badgeCard, styles.badgeCardUnearned, { opacity }]}>
      <View style={[styles.skeletonBlock, { width: 32, height: 32, borderRadius: 8, marginBottom: 8 }]} />
      <View style={[styles.skeletonBlock, { width: '80%', height: 10, borderRadius: 4, marginBottom: 4 }]} />
      <View style={[styles.skeletonBlock, { width: '50%', height: 9, borderRadius: 4 }]} />
    </Animated.View>
  );
}

// Skeleton for the stats row
function SkeletonStat() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.statCol, { opacity }]}>
      <View style={[styles.skeletonBlock, { width: 40, height: 28, borderRadius: 6, marginBottom: 6 }]} />
      <View style={[styles.skeletonBlock, { width: 48, height: 11, borderRadius: 4 }]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Achievement badge card
// ---------------------------------------------------------------------------

function BadgeCard({ achievement }: { achievement: AchievementDef }) {
  const earned = achievement.earned;
  return (
    <View style={[styles.badgeCard, earned ? styles.badgeCardEarned : styles.badgeCardUnearned]}>
      {/* Icon — full opacity when earned, 30% when locked */}
      <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
        {achievement.icon}
      </Text>
      {/* Name */}
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
        {achievement.name}
      </Text>
      {/* Date earned or LOCKED label */}
      {earned && achievement.earnedAt ? (
        <Text style={styles.badgeDate} numberOfLines={1}>
          {fmtDate(achievement.earnedAt)}
        </Text>
      ) : (
        <Text style={styles.badgeLocked}>LOCKED</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stats row — 4 columns: Hunts, Clues, Points, Badges
// ---------------------------------------------------------------------------

interface StatColProps {
  value: number;
  label: string;
  icon: string;
}

function StatCol({ value, label, icon }: StatColProps) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touristCity, setTouristCity] = useState<string | null>(null);

  // Fetches profile and achievement data in parallel
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [profileData, achievementsData] = await Promise.all([
        playerFetch<PlayerProfile>('/api/v1/player/profile'),
        playerFetch<AchievementDef[]>('/api/v1/player/achievements'),
      ]);
      setProfile(profileData);
      setAchievements(achievementsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    }
  }, []);

  // Initial load on mount — profile data + tourist city pref
  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      const [, prefs] = await Promise.all([fetchData(), getTouristPrefs()]);
      setTouristCity(prefs.city);
      setIsLoading(false);
    })();
  }, [fetchData]);

  // Refresh tourist city when screen comes back into focus (e.g. returning from city-select)
  useEffect(() => {
    getTouristPrefs().then((prefs) => setTouristCity(prefs.city));
  }, []);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  // Sign-out handler — fire-and-forget; AuthProvider handles navigation redirect
  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  // Header bar — always visible regardless of load state
  const Header = (
    <View style={styles.header}>
      <View>
        <Text style={styles.brandLabel}>TREASURE HUNT</Text>
        <Text style={styles.greeting}>
          Hey, {user?.displayName ?? '…'}
        </Text>
        {profile ? (
          <Text style={styles.memberSince}>
            {fmtMemberSince(profile.player.createdAt)}
          </Text>
        ) : user?.createdAt ? (
          <Text style={styles.memberSince}>
            {fmtMemberSince(user.createdAt)}
          </Text>
        ) : null}
        {profile?.stats.tier && (
          <View style={[styles.tierBadge, { borderColor: profile.stats.tier.color + '55', backgroundColor: profile.stats.tier.color + '18' }]}>
            <Text style={styles.tierIcon}>{profile.stats.tier.icon}</Text>
            <Text style={[styles.tierLabel, { color: profile.stats.tier.color }]}>{profile.stats.tier.label}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
        accessibilityLabel="Sign out"
        accessibilityRole="button"
      >
        <Text style={styles.logoutText}>sign out</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        {Header}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats skeleton */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </View>
          </View>
          {/* Achievements skeleton */}
          <View style={styles.sectionHeader}>
            <View style={[styles.skeletonBlock, { width: 130, height: 13, borderRadius: 4 }]} />
          </View>
          <View style={styles.badgeGrid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonBadge key={i} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        {Header}
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateBody}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main content
  // ---------------------------------------------------------------------------
  const stats = profile?.stats ?? {
    huntsCompleted: 0,
    totalPoints: 0,
    totalCluesFound: 0,
    achievementsEarned: 0,
  };

  return (
    <SafeAreaView style={styles.root}>
      {Header}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* Stats row */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatCol value={stats.huntsCompleted}   label="Hunts"  icon="🗺️" />
            <View style={styles.statDivider} />
            <StatCol value={stats.totalCluesFound}  label="Clues"  icon="🔍" />
            <View style={styles.statDivider} />
            <StatCol value={stats.totalPoints}      label="Points" icon="💎" />
            <View style={styles.statDivider} />
            <StatCol value={stats.achievementsEarned} label="Badges" icon={stats.tier?.icon ?? '🏆'} />
          </View>
        </View>

        {/* Achievements section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          {achievements.length > 0 && (
            <Text style={styles.sectionCount}>
              {stats.achievementsEarned}/{achievements.length}
            </Text>
          )}
        </View>

        {achievements.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Text style={styles.stateIcon}>🏅</Text>
            <Text style={styles.stateTitle}>No achievements yet</Text>
            <Text style={styles.stateBody}>Complete hunts to unlock badges</Text>
          </View>
        ) : (
          // Manual 3-column grid — avoids FlatList-inside-ScrollView nesting issues
          <View style={styles.badgeGrid}>
            {achievements.map((a) => (
              <BadgeCard key={a.id} achievement={a} />
            ))}
          </View>
        )}

        {/* Settings section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
        </View>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/onboarding/city-select?from=profile')}
            activeOpacity={0.7}
          >
            <View style={styles.settingsLeft}>
              <Text style={styles.settingsIcon}>📍</Text>
              <View>
                <Text style={styles.settingsLabel}>My City</Text>
                <Text style={styles.settingsValue}>
                  {touristCity ?? 'All cities'}
                </Text>
              </View>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BADGE_GAP = 10;

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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  memberSince: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  logoutButton: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE2,
  },
  logoutText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierIcon: {
    fontSize: 14,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Scroll content
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },

  // Stats card
  statsCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: BORDER,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },

  // Achievement badge grid — 3 columns, flex-wrap
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BADGE_GAP,
  },
  badgeCard: {
    // Each card occupies ~1/3 of the row width; gap is handled by the parent's gap property
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '32%',
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  badgeCardEarned: {
    backgroundColor: SURFACE,
    borderColor: ACCENT + '66',
  },
  badgeCardUnearned: {
    backgroundColor: SURFACE2,
    borderColor: BORDER,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeIconLocked: {
    opacity: 0.3,
  },
  badgeName: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
    lineHeight: 14,
  },
  badgeNameLocked: {
    color: MUTED,
  },
  badgeDate: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeLocked: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.6,
  },

  // Skeleton blocks
  skeletonBlock: {
    backgroundColor: SURFACE2,
  },

  // Empty badges state (within the scroll area, not full-screen)
  emptyBadges: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  // Center states (error)
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

  // Settings section
  settingsCard: {
    marginHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 32,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    fontSize: 20,
  },
  settingsLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsValue: {
    color: MUTED,
    fontSize: 12,
  },
  settingsChevron: {
    color: MUTED,
    fontSize: 20,
    fontWeight: '300',
  },
});
