/**
 * Copy + badge mapping for API tier data (S36 tier card, S38 tier-up list).
 * Pure: node tests import it directly.
 */
import type { ApiNextTarget, ApiTierChange, ApiTierStanding } from "../../lib/api/strength-exercise";
import { labelOfStep, MAX_STEP, type Division, type TierPlace } from "../strength-ui/tier-meta";

/** API division 3 = III (entry) … 1 = I (top). */
const DIVISION: Record<1 | 2 | 3, Division> = { 1: "I", 2: "II", 3: "III" };

export const placeOf = (s: Pick<ApiTierStanding, "tier" | "division">): TierPlace => ({
  tier: s.tier,
  division: s.tier === "legendary" || s.division == null ? null : DIVISION[s.division],
});

/** 0..100 for the progress bar. Legendary (no next step) is full. */
export const progressPct = (s: ApiTierStanding): number =>
  s.progressToNext == null ? 100 : Math.round(Math.min(1, Math.max(0, s.progressToNext)) * 100);

/** "60% to Gold II"; "Top tier" at Legendary. */
export const progressCopy = (s: ApiTierStanding): string =>
  s.progressToNext == null || s.step >= MAX_STEP
    ? "Top tier"
    : `${progressPct(s)}% to ${labelOfStep(s.step + 1)}`;

/** "Next: 185 lb × 8 for 2 sessions → Gold II". */
export const nextCopy = (n: ApiNextTarget): string =>
  `Next: ${n.display} for ${n.sessions} ${n.sessions === 1 ? "session" : "sessions"} → ${n.toLabel}`;

export type TierCardCopy =
  | { readonly kind: "ranked"; readonly standing: ApiTierStanding; readonly next: string | null }
  | { readonly kind: "unranked"; readonly title: string; readonly body: string };

type CardInput = {
  readonly ranked: boolean;
  readonly standing: ApiTierStanding | null;
  readonly next: ApiNextTarget | null;
} | null;

/** Honest copy: lifts without a standard never pretend to have a tier. */
export const tierCardCopy = (data: CardInput): TierCardCopy => {
  if (!data || !data.ranked) {
    return {
      kind: "unranked",
      title: "Unranked lift",
      body: "This lift has no strength standard yet. Your sets still count toward muscle volume.",
    };
  }
  if (!data.standing) {
    return {
      kind: "unranked",
      title: "Unranked",
      body: "Log a working set of this lift to get your tier.",
    };
  }
  return { kind: "ranked", standing: data.standing, next: data.next ? nextCopy(data.next) : null };
};

const SCOPE_ORDER: Record<ApiTierChange["scope"], number> = {
  overall: 0,
  group: 1,
  muscle: 2,
  exercise: 3,
};

export const MAX_TIER_ROWS = 6;

const rowKey = (c: ApiTierChange): string =>
  `${c.name.trim().toLowerCase()}|${c.from?.label ?? ""}|${c.to.label}`;

/**
 * Overall first, then group > muscle > exercise; stable; capped at 6.
 * A one-muscle group (Chest group = chest muscle) reads as the same row twice: keep the first.
 */
export const orderTierChanges = (changes: readonly ApiTierChange[] | null | undefined): ApiTierChange[] => {
  const seen = new Set<string>();
  return (changes ?? [])
    .map((c, i) => ({ c, i }))
    .sort((a, b) => SCOPE_ORDER[a.c.scope] - SCOPE_ORDER[b.c.scope] || a.i - b.i)
    .map(({ c }) => c)
    .filter((c) => {
      const key = rowKey(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TIER_ROWS);
};

/** "Silver I → Gold III"; first rank reads "Unranked → Gold III". */
export const transitionCopy = (c: ApiTierChange): string =>
  `${c.from?.label ?? "Unranked"} → ${c.to.label}`;

/** Overall row sub line: "from Silver III" / "First rank". */
export const fromCopy = (c: ApiTierChange): string => (c.from ? `from ${c.from.label}` : "First rank");

/** "3 changes" / "1 change". */
export const changesCopy = (n: number): string => `${n} ${n === 1 ? "change" : "changes"}`;
