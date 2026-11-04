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

const byTier = (defs: readonly BadgeDefinition[]) => [...defs].sort((a, b) => a.tier - b.tier);

/**
 * Highest tier the server has awarded (`user_badges`). The server's unlocked set is the source
 * of truth (AMI-171): `bestStreak` can cross a threshold without a badge row (the award is
 * best-effort and only retried on the next streak write), so tiers never derive from it.
 */
export const earnedRankId = (defs: readonly BadgeDefinition[], unlocked: ReadonlySet<string>): string | null =>
  byTier(defs).filter((d) => unlocked.has(d.id)).at(-1)?.id ?? null;

/**
 * S33 row states, from the server's unlocked set: every awarded tier is `unlocked`; the first
 * tier not yet awarded is `active` (the one being worked through), the next one `progress`,
 * the rest `locked`. When every tier is unlocked the top one stays `active`.
 */
export type TierState = "unlocked" | "active" | "progress" | "locked";

export type LadderRow = {
  readonly def: BadgeDefinition;
  readonly state: TierState;
  /** Highest tier on the ladder (Apex). */
  readonly isTop: boolean;
};

export const ladderRows = (defs: readonly BadgeDefinition[], unlocked: ReadonlySet<string>): LadderRow[] => {
  const sorted = byTier(defs);
  const open = sorted.filter((d) => !unlocked.has(d.id)).map((d) => d.id);
  return sorted.map((def, i) => {
    const isTop = i === sorted.length - 1;
    let state: TierState = "locked";
    if (open.length === 0) state = isTop ? "active" : "unlocked";
    else if (unlocked.has(def.id)) state = "unlocked";
    else if (def.id === open[0]) state = "active";
    else if (def.id === open[1]) state = "progress";
    return { def, state, isTop };
  });
};

/** Tier being worked through (first not yet awarded), or null when the ladder is complete. */
export const activeTier = (defs: readonly BadgeDefinition[], unlocked: ReadonlySet<string>) => {
  const sorted = byTier(defs);
  const i = sorted.findIndex((d) => !unlocked.has(d.id));
  if (i === -1) return null;
  return { def: sorted[i], index: i, clearedDay: i > 0 ? sorted[i - 1].thresholdDays : 0 };
};

/** S40 Today rank chip: earned title, or the locked first tier with progress ("Spark 3/7"). */
export type RankChipModel = { readonly label: string; readonly locked: boolean; readonly icon: RankIcon };

export const rankChipModel = (data: BadgesResponse | null): RankChipModel | null => {
  if (!data || data.definitions.length === 0) return null;
  const earned = earnedRankId(data.definitions, unlockedSet(data.unlocked));
  const title = titleForRank(data.definitions, earned);
  if (title && earned) return { label: title, locked: false, icon: rankVisualFor(earned).icon };
  const first = byTier(data.definitions)[0];
  const best = Math.min(data.bestStreak, first.thresholdDays);
  return { label: `${first.title} ${best}/${first.thresholdDays}`, locked: true, icon: "bolt" };
};
