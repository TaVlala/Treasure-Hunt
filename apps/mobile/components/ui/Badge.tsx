// Badge.tsx — reusable pill badge for difficulty, status, type labels across the mobile app.
// Keeps color semantics in one place so they're consistent everywhere.

import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/lib/theme';

type DifficultyLevel = 'easy' | 'medium' | 'hard';
type HuntStatus = 'active' | 'draft' | 'paused' | 'completed' | 'archived';

interface BadgeProps {
  label: string;
  color: string;       // text + border color
  bgColor?: string;    // fill; defaults to color + low opacity
}

// Generic badge — use DifficultyBadge / StatusBadge helpers for common cases
export function Badge({ label, color, bgColor }: BadgeProps) {
  const bg = bgColor ?? color + '1a';
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + '44' }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

// Difficulty-specific badge with preset colours
export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
  const map: Record<DifficultyLevel, { label: string; color: string }> = {
    easy:   { label: 'Easy',   color: Colors.green },
    medium: { label: 'Medium', color: Colors.accent },
    hard:   { label: 'Hard',   color: Colors.red },
  };
  const { label, color } = map[difficulty];
  return <Badge label={label} color={color} />;
}

// Price badge (FREE vs paid amount string)
export function PriceBadge({ label, isFree }: { label: string; isFree: boolean }) {
  return (
    <Badge
      label={label}
      color={isFree ? Colors.green : Colors.accent}
    />
  );
}

// Hunt status badge
export function StatusBadge({ status }: { status: HuntStatus }) {
  const map: Record<HuntStatus, { label: string; color: string }> = {
    active:    { label: 'Active',    color: Colors.green },
    draft:     { label: 'Draft',     color: Colors.textMuted },
    paused:    { label: 'Paused',    color: Colors.yellow },
    completed: { label: 'Completed', color: Colors.blue },
    archived:  { label: 'Archived',  color: Colors.textFaint },
  };
  const { label, color } = map[status] ?? { label: status, color: Colors.textMuted };
  return <Badge label={label} color={color} />;
}

// Dot + label row — used in the hunt card difficulty tag
export function DotBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.dotBadge, { borderColor: color + '44', backgroundColor: color + '14' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.dotLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSize.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  dotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
  },
});
