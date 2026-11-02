import type { BadgeDefinition } from "@/lib/api/badges";

export type RankVisual = {
  readonly icon: "bolt" | "flame" | "forge" | "volt" | "apex";
  readonly blurb: string;
};

const BLURBS: Record<string, string> = {
  rank_spark: "Daily check-in momentum starts here.",
  rank_ember: "Consistent microcycles forge heat.",
  rank_forge: "Thirty days of locked adherence.",
  rank_volt: "High-voltage training discipline.",
  rank_apex: "Elite kinetic performance tier.",
};

export const rankVisualFor = (id: string): RankVisual => {
  if (id === "rank_ember") return { icon: "flame", blurb: BLURBS[id] ?? "" };
  if (id === "rank_forge") return { icon: "forge", blurb: BLURBS[id] ?? "" };
  if (id === "rank_volt") return { icon: "volt", blurb: BLURBS[id] ?? "" };
  if (id === "rank_apex") return { icon: "apex", blurb: BLURBS[id] ?? "" };
  return { icon: "bolt", blurb: BLURBS.rank_spark };
};

export const titleForRank = (defs: readonly BadgeDefinition[], id: string | null): string | null => {
  if (!id) return null;
  return defs.find((d) => d.id === id)?.title ?? null;
};

export const unlockedSet = (unlocked: readonly { badgeId: string }[]): Set<string> =>
  new Set(unlocked.map((u) => u.badgeId));

export const progressToNext = (
  bestStreak: number,
  next: BadgeDefinition | undefined,
): { current: number; target: number; label: string } | null => {
  if (!next) return null;
  return {
    current: bestStreak,
    target: next.thresholdDays,
    label: `${bestStreak} / ${next.thresholdDays} Days`,
  };
};
