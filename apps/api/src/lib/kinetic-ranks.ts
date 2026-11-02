/** Kinetic rank ladder thresholds (best check-in streak days). */
export const KINETIC_RANK_IDS = [
  "rank_spark",
  "rank_ember",
  "rank_forge",
  "rank_volt",
  "rank_apex",
] as const;

export type KineticRankId = (typeof KINETIC_RANK_IDS)[number];

export type StreakGteRule = { readonly type: "streak_gte"; readonly n: number };

export const parseStreakGteRule = (ruleJson: string): number | null => {
  try {
    const value: unknown = JSON.parse(ruleJson);
    if (!value || typeof value !== "object") return null;
    const rule = value as StreakGteRule;
    if (rule.type !== "streak_gte" || typeof rule.n !== "number") return null;
    return rule.n;
  } catch {
    return null;
  }
};

export const currentRankIdForBest = (
  tiers: readonly { id: string; threshold: number }[],
  bestStreak: number,
): string | null => {
  let current: string | null = null;
  for (const tier of tiers) {
    if (bestStreak >= tier.threshold) current = tier.id;
  }
  return current;
};

export const nextRankIdForBest = (
  tiers: readonly { id: string; threshold: number }[],
  bestStreak: number,
): string | null => {
  for (const tier of tiers) {
    if (bestStreak < tier.threshold) return tier.id;
  }
  return null;
};
