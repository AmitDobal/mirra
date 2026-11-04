/**
 * Pure view models for S34 / S35 / S37 + the You teaser. No React, no fetch:
 * API responses in, display strings + tier places out (unit-tested).
 */
import type {
  BestSet,
  MuscleGroupId,
  MuscleId,
  MuscleStrengthResponse,
  StrengthOverviewResponse,
  StrengthUnits,
  TierStanding,
} from "@mirra/contracts";

import { GROUP_LABEL, GROUP_MUSCLES, GROUP_ORDER, strengthCopy } from "../../content/strength";
import { labelOfStep, MAX_STEP, pipCount, TIER_IDS, type Division, type TierId, type TierPlace } from "../strength-ui/tier-meta";

const DIVISION_OF: Record<1 | 2 | 3, Division> = { 1: "I", 2: "II", 3: "III" };

/** API standing → badge place (division 3 = III). Null = unranked. */
export const placeOf = (standing: TierStanding | null | undefined): TierPlace | null =>
  standing
    ? { tier: standing.tier, division: standing.division === null ? null : DIVISION_OF[standing.division] }
    : null;

type Unlock = StrengthOverviewResponse["unlock"];

/** "3/8" while lifts are short, then "4/5 groups" while groups are short. */
export const unlockProgress = (u: Unlock): string =>
  u.ranked < u.rankedNeeded ? `${u.ranked}/${u.rankedNeeded}` : `${u.groups}/${u.groupsNeeded} groups`;

export type OverallView =
  | { readonly kind: "ranked"; readonly place: TierPlace; readonly title: string; readonly sub: string }
  | { readonly kind: "locked"; readonly title: string; readonly sub: string }
  | { readonly kind: "empty"; readonly title: string; readonly sub: string }
  | { readonly kind: "bodyweight"; readonly title: string; readonly sub: string };

export const overallView = (r: StrengthOverviewResponse): OverallView => {
  if (r.needsBodyweight) {
    return { kind: "bodyweight", title: strengthCopy.bodyweightTitle, sub: strengthCopy.bodyweightSub };
  }
  const place = placeOf(r.overall);
  if (place && r.overall) {
    return {
      kind: "ranked",
      place,
      title: r.overall.label,
      sub: strengthCopy.overallSub(r.unlock.ranked, r.unlock.groups),
    };
  }
  if (r.unlock.ranked === 0) {
    return { kind: "empty", title: strengthCopy.emptyTitle, sub: strengthCopy.emptySub };
  }
  return {
    kind: "locked",
    title: strengthCopy.lockedTitle,
    sub: strengthCopy.lockedSub(r.unlock.rankedNeeded, r.unlock.groupsNeeded, unlockProgress(r.unlock)),
  };
};

/** Anatomy tier mode input: ranked muscles only (missing = dark). */
export const tierSteps = (r: StrengthOverviewResponse): Partial<Record<MuscleId, number>> => {
  const steps: Partial<Record<MuscleId, number>> = {};
  for (const m of r.muscles) if (m.standing) steps[m.id] = m.standing.step;
  return steps;
};

export type GroupRow = {
  readonly id: MuscleGroupId;
  readonly name: string;
  readonly place: TierPlace | null;
  readonly label: string;
};

/** Six rows in S34 order, "Unranked" when the group has no ranked muscle. */
export const groupRows = (r: StrengthOverviewResponse): GroupRow[] =>
  GROUP_ORDER.map((id) => {
    const standing = r.groups.find((g) => g.id === id)?.standing ?? null;
    return { id, name: GROUP_LABEL[id], place: placeOf(standing), label: standing?.label ?? strengthCopy.unranked };
  });

/** Of several muscles (one drawn region or one group), the highest ranked; else the first. */
export const pickMuscle = (
  ids: readonly MuscleId[],
  steps: Partial<Record<MuscleId, number>>,
): MuscleId | null => {
  let best: MuscleId | null = null;
  for (const id of ids) {
    const s = steps[id];
    if (s === undefined) continue;
    if (best === null || s > (steps[best] ?? -1)) best = id;
  }
  return best ?? ids[0] ?? null;
};

export const muscleForGroup = (group: MuscleGroupId, steps: Partial<Record<MuscleId, number>>): MuscleId =>
  pickMuscle(GROUP_MUSCLES[group], steps) ?? GROUP_MUSCLES[group][0];

const KG_TO_LB = 2.20462;

/** Logged load in the user's units: "175 lb", "80 kg", "22.5 kg". */
export const formatLoad = (kg: number, units: StrengthUnits): string => {
  if (units === "imperial") return `${Math.round(kg * KG_TO_LB)} lb`;
  const v = Math.round(kg * 2) / 2;
  return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)} kg`;
};

/** "175 lb × 8"; no added load = "bodyweight × 22". */
export const bestSetText = (best: BestSet | null, units: StrengthUnits): string | null => {
  if (!best) return null;
  if (best.weightKg === null || best.weightKg <= 0) return `bodyweight × ${best.reps}`;
  return `${formatLoad(best.weightKg, units)} × ${best.reps}`;
};

export type ContributorRow = {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly place: TierPlace | null;
  readonly label: string;
};

export type MuscleDetailView = {
  readonly place: TierPlace | null;
  readonly title: string;
  readonly progress: { readonly label: string; readonly pct: number } | null;
  readonly next: { readonly display: string; readonly line: string } | null;
  readonly contributors: readonly ContributorRow[];
  /** Unranked muscle: "Log a lift that trains chest to rank it." */
  readonly note: string | null;
};

/** S35 sheet. `muscleName` is the display label ("Chest", "Front delts"). */
export const muscleDetailView = (r: MuscleStrengthResponse, muscleName: string): MuscleDetailView => {
  const s = r.standing;
  const lower = muscleName.toLowerCase();
  const progress =
    s && s.step < MAX_STEP && s.progressToNext !== null
      ? {
          label: strengthCopy.progressTo(labelOfStep(s.step + 1)),
          pct: Math.min(100, Math.max(0, Math.round(s.progressToNext * 100))),
        }
      : null;
  return {
    place: placeOf(s),
    title: s?.label ?? strengthCopy.unranked,
    progress,
    next: r.next
      ? { display: r.next.display, line: strengthCopy.nextLine(r.next.exerciseName, r.next.sessions, r.next.toLabel) }
      : null,
    contributors: r.contributors.map((c) => ({
      id: c.exerciseId,
      name: c.name,
      detail: strengthCopy.contributorDetail(Math.round(c.involvementPct), lower, bestSetText(c.bestSet, r.units)),
      place: placeOf(c.standing),
      label: c.standing?.label ?? strengthCopy.unranked,
    })),
    note: s ? null : strengthCopy.unrankedMuscle(lower),
  };
};

export type TeaserView = { readonly place: TierPlace | null; readonly title: string; readonly line: string };

/** You tab card: overall label, or "Locked · 3/8". */
export const teaserView = (r: StrengthOverviewResponse | null): TeaserView => {
  if (!r) return { place: null, title: strengthCopy.teaserEmpty, line: strengthCopy.teaserLine };
  const place = placeOf(r.overall);
  if (place && r.overall) return { place, title: r.overall.label, line: strengthCopy.teaserLine };
  if (r.needsBodyweight) return { place: null, title: strengthCopy.bodyweightTitle, line: strengthCopy.teaserLine };
  return { place: null, title: strengthCopy.teaserLocked(unlockProgress(r.unlock)), line: strengthCopy.teaserLine };
};

export type LadderRow = {
  readonly tier: TierId;
  readonly current: boolean;
  /** Pips under the badge: the user's division on the current row, else all 3 (Legendary 0). */
  readonly pips: number;
  readonly right: string;
};

/** S37: Legendary first, the user's overall tier highlighted. */
export const ladderRows = (overall: TierStanding | null | undefined): LadderRow[] => {
  const me = placeOf(overall);
  return [...TIER_IDS].reverse().map((tier) => {
    const current = me?.tier === tier;
    const pips = tier === "legendary" ? 0 : current ? pipCount(me?.division ?? null) : 3;
    const right = current && overall ? strengthCopy.ladderYou(overall.label) : tier === "legendary" ? strengthCopy.ladderTop : strengthCopy.ladderDivisions;
    return { tier, current, pips, right };
  });
};
