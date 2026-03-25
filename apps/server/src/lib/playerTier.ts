// Player tier — ranking based on total points earned across all hunts.
// Tiers: Bronze (0–249), Silver (250–999), Gold (1000–2999), Platinum (3000+).

export type PlayerTier = {
  label: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  icon: string;
  color: string;
  minPoints: number;
};

const TIERS: PlayerTier[] = [
  { label: 'Bronze',   icon: '🥉', color: '#cd7f32', minPoints: 0    },
  { label: 'Silver',   icon: '🥈', color: '#a8a9ad', minPoints: 250  },
  { label: 'Gold',     icon: '🥇', color: '#f59e0b', minPoints: 1000 },
  { label: 'Platinum', icon: '💎', color: '#e5e4e2', minPoints: 3000 },
];

// Returns the highest tier the player qualifies for
export function getTier(totalPoints: number): PlayerTier {
  const tier = [...TIERS].reverse().find((t) => totalPoints >= t.minPoints);
  return tier ?? TIERS[0]!;
}
