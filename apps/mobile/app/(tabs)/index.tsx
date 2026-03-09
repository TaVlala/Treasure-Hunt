// Hunt discovery screen — placeholder for Phase 1.
// Will show a map + list of available hunts in the next chunk.

import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function DiscoverScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandLabel}>TREASURE HUNT</Text>
          <Text style={styles.greeting}>
            Hey, {user?.displayName ?? 'Explorer'} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Placeholder — hunt list / map comes in the next chunk */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderEmoji}>🗺️</Text>
        <Text style={styles.placeholderTitle}>Hunt Discovery</Text>
        <Text style={styles.placeholderBody}>
          Hunt list and map view coming next.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const BG = '#0a0a0a';
const SURFACE = '#141414';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
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
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  placeholderBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
