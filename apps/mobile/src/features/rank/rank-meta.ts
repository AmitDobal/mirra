import { RANK_UNLOCK_COPY } from "@/content/rank";
import type { BadgeDefinition, BadgesResponse } from "@/lib/api/badges";

export type RankIcon = "bolt" | "flame" | "forge" | "volt" | "apex";

export type RankVisual = {
  readonly icon: RankIcon;
  readonly blurb: string;
};

const ICONS: Record<string, RankIcon> = {
  rank_spark: "bolt",
  rank_ember: "flame",
  rank_forge: "forge",
  rank_volt: "volt",
  rank_apex: "apex",
};

export const rankVisualFor = (id: string): RankVisual => ({
  icon: ICONS[id] ?? "bolt",
  blurb: RANK_UNLOCK_COPY[id] ?? RANK_UNLOCK_COPY.rank_spark,
});

export const titleForRank = (defs: readonly BadgeDefinition[], id: string | null): string | null => {
  if (!id) return null;
  return defs.find((d) => d.id === id)?.title ?? null;
};

export const unlockedSet = (unlocked: readonly { badgeId: string }[]): Set<string> =>
  new Set(unlocked.map((u) => u.badgeId));

/**
 * S33 row states, by best streak: every tier at or below best is `unlocked`; the first tier
 * above it is `active` (the one being worked through), the next is `progress`, the rest `locked`.
 * When every tier is unlocked the top one stays `active`.
 */
export type TierState = "unlocked" | "active" | "progress" | "locked";

export type LadderRow = {
  readonly def: BadgeDefinition;
  readonly state: TierState;
  /** Highest tier on the ladder (Apex). */
  readonly isTop: boolean;
};

export const ladderRows = (defs: readonly BadgeDefinition[], best: number): LadderRow[] => {
  const sorted = [...defs].sort((a, b) => a.tier - b.tier);
  const firstOpen = sorted.findIndex((d) => best < d.thresholdDays);
  return sorted.map((def, i) => {
    let state: TierState = "locked";
    if (firstOpen === -1) state = i === sorted.length - 1 ? "active" : "unlocked";
    else if (i < firstOpen) state = "unlocked";
    else if (i === firstOpen) state = "active";
    else if (i === firstOpen + 1) state = "progress";
    return { def, state, isTop: i === sorted.length - 1 };
  });
};

/** Tier being worked through (first not yet unlocked), or null when the ladder is complete. */
export const activeTier = (defs: readonly BadgeDefinition[], best: number) => {
  const sorted = [...defs].sort((a, b) => a.tier - b.tier);
  const i = sorted.findIndex((d) => best < d.thresholdDays);
  if (i === -1) return null;
  return { def: sorted[i], index: i, clearedDay: i > 0 ? sorted[i - 1].thresholdDays : 0 };
};

/** S40 Today rank chip: earned title, or the locked first tier with progress ("Spark 3/7"). */
export type RankChipModel = { readonly label: string; readonly locked: boolean; readonly icon: RankIcon };

export const rankChipModel = (data: BadgesResponse | null): RankChipModel | null => {
  if (!data || data.definitions.length === 0) return null;
  const title = titleForRank(data.definitions, data.currentRankId);
  if (title && data.currentRankId) {
    return { label: title, locked: false, icon: rankVisualFor(data.currentRankId).icon };
  }
  const first = [...data.definitions].sort((a, b) => a.tier - b.tier)[0];
  const best = Math.min(data.bestStreak, first.thresholdDays);
  return { label: `${first.title} ${best}/${first.thresholdDays}`, locked: true, icon: "bolt" };
};
