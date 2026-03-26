// city-select.tsx — Tourist mode onboarding screen.
// Shown on first launch after login. Player picks their city or chooses "Explore all".
// Also reachable from profile settings to change city preference.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { playerFetch } from '@/lib/api';
import { setTouristCity } from '@/lib/touristPrefs';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

export default function CitySelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromProfile = params.from === 'profile';

  const [cities, setCities] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // null = explore all
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch available cities from public API
  useEffect(() => {
    playerFetch<string[]>('/api/v1/public/cities')
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  // Save preference and navigate
  async function handleConfirm() {
    setSaving(true);
    try {
      await setTouristCity(selected);
      if (fromProfile) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Back button when coming from profile */}
      {fromProfile && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroIcon}>🗺️</Text>
          <Text style={styles.headline}>Where are you{'\n'}exploring?</Text>
          <Text style={styles.subheadline}>
            We'll show you hunts in your city first.{'\n'}You can change this anytime.
          </Text>
        </View>

        {/* City chips */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.loadingText}>Finding cities…</Text>
          </View>
        ) : (
          <View style={styles.chipGrid}>
            {/* Explore all option */}
            <TouchableOpacity
              style={[styles.chip, selected === null && styles.chipSelected]}
              onPress={() => setSelected(null)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selected === null && styles.chipTextSelected]}>
                🌍  Explore all
              </Text>
            </TouchableOpacity>

            {cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.chip, selected === city && styles.chipSelected]}
                onPress={() => setSelected(city)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selected === city && styles.chipTextSelected]}>
                  📍  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected summary */}
        <Text style={styles.selectionNote}>
          {selected
            ? `Showing hunts in ${selected}`
            : 'Showing hunts from all cities'}
        </Text>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <Button
          label={fromProfile ? 'Save preference' : 'Start Exploring'}
          onPress={() => void handleConfirm()}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  backText: {
    color: Colors.textMuted,
    fontFamily: Fonts.bodyMed,
    fontSize: FontSize.base,
  },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },

  heroBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxxl,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  subheadline: {
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.accentBg,
    borderColor: Colors.accent,
  },
  chipText: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  chipTextSelected: {
    color: Colors.accent,
  },

  selectionNote: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textFaint,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
