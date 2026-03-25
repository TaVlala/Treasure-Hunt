// Achievement definitions and evaluation logic.
// Achievements are evaluated after every clue submit and hunt completion.
// Definitions are hardcoded here; earned state lives in PlayerAchievement table.

import type { PrismaClient } from '@prisma/client';

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
};

// All available achievements in the platform
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_hunt',       name: 'First Hunt',        description: 'Complete your first hunt',                        icon: '🗺️' },
  { id: 'speed_runner',     name: 'Speed Runner',      description: 'Complete a hunt in under 30 minutes',             icon: '⚡' },
  { id: 'no_hints',         name: 'Pure Skill',        description: 'Complete a hunt without using any hints',         icon: '🎯' },
  { id: 'clue_hunter_10',   name: 'Clue Hunter',       description: 'Find 10 clues across all hunts',                  icon: '🔍' },
  { id: 'clue_hunter_50',   name: 'Veteran Explorer',  description: 'Find 50 clues across all hunts',                  icon: '🏛️' },
  { id: 'explorer',         name: 'Explorer',          description: 'Complete 3 different hunts',                      icon: '🧭' },
  { id: 'bonus_hunter',     name: 'Bonus Hunter',      description: 'Find 3 bonus clues',                              icon: '⭐' },
  { id: 'point_collector',  name: 'High Scorer',       description: 'Earn 500 total points',                           icon: '💎' },
];

// Evaluates which achievements the player has just unlocked and persists them.
// Returns only the newly earned AchievementDef entries (not previously earned ones).
export async function evaluateAchievements(
  prisma: PrismaClient,
  playerId: string,
  sessionId: string,
): Promise<AchievementDef[]> {
  // 1. Load already-earned achievement IDs for this player
  const alreadyEarned = await prisma.playerAchievement.findMany({
    where: { playerId },
    select: { achievementId: true },
  });
  const earnedSet = new Set(alreadyEarned.map((a) => a.achievementId));

  // 2. Load aggregated player stats in parallel
  const [completedSessions, cluesSumResult, pointsSumResult, currentSession] = await Promise.all([
    prisma.gameSession.count({ where: { playerId, status: 'COMPLETED' } }),
    prisma.gameSession.aggregate({ where: { playerId }, _sum: { cluesFound: true } }),
    prisma.gameSession.aggregate({ where: { playerId }, _sum: { score: true } }),
    prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        progress: {
          include: {
            clue: { select: { isBonus: true } },
          },
        },
      },
    }),
  ]);

  const totalCluesFound = cluesSumResult._sum.cluesFound ?? 0;
  const totalPoints = pointsSumResult._sum.score ?? 0;

  // 3. Check each achievement condition and collect newly qualifying IDs
  const newIds: string[] = [];

  // Helper — only test achievements not yet earned
  const check = (id: string, condition: boolean) => {
    if (!earnedSet.has(id) && condition) {
      newIds.push(id);
    }
  };

  check('first_hunt', completedSessions >= 1);

  // speed_runner: session must be completed and duration <= 30 minutes
  if (currentSession && currentSession.status === 'COMPLETED' && currentSession.completedAt && currentSession.startedAt) {
    const durationSecs = (currentSession.completedAt.getTime() - currentSession.startedAt.getTime()) / 1000;
    check('speed_runner', durationSecs <= 1800);
  }

  // no_hints: session must be completed and no progress row has hintUsed = true
  if (currentSession && currentSession.status === 'COMPLETED') {
    const anyHintUsed = currentSession.progress.some((p) => p.hintUsed);
    check('no_hints', !anyHintUsed);
  }

  check('clue_hunter_10', totalCluesFound >= 10);
  check('clue_hunter_50', totalCluesFound >= 50);
  check('explorer', completedSessions >= 3);

  // bonus_hunter: count FOUND progress rows where clue.isBonus = true across ALL player sessions
  if (!earnedSet.has('bonus_hunter')) {
    const bonusCount = await prisma.playerProgress.count({
      where: {
        session: { playerId },
        status: 'FOUND',
        clue: { isBonus: true },
      },
    });
    check('bonus_hunter', bonusCount >= 3);
  }

  check('point_collector', totalPoints >= 500);

  // 4. If nothing new, return early
  if (newIds.length === 0) {
    return [];
  }

  // 5. Persist newly earned achievements (skipDuplicates guards concurrent calls)
  await prisma.playerAchievement.createMany({
    data: newIds.map((id) => ({ playerId, achievementId: id })),
    skipDuplicates: true,
  });

  // 6. Return the full AchievementDef objects for each newly earned achievement
  return newIds
    .map((id) => ACHIEVEMENTS.find((def) => def.id === id))
    .filter((def): def is AchievementDef => def !== undefined);
}
