/**
 * Strength Tier copy (S34 map, S35 muscle sheet, S37 ladder, You teaser).
 * Honest lines only: no percentile claims beyond "Top tier" for Legendary.
 */
import type { MuscleGroupId, MuscleId } from "@mirra/contracts";

export const GROUP_LABEL: Record<MuscleGroupId, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
};

/** S34 row order. */
export const GROUP_ORDER: readonly MuscleGroupId[] = ["chest", "back", "shoulders", "arms", "legs", "core"];

/** Mirrors contracts `MUSCLE_GROUP_OF` (type-checked; runtime contracts stay out of the bundle). */
export const GROUP_MUSCLES = {
  chest: ["chest"],
  back: ["lats", "upper_back", "traps", "lower_back"],
  shoulders: ["front_delts", "side_delts", "rear_delts"],
  arms: ["biceps", "triceps", "forearms"],
  legs: ["quads", "glutes", "hamstrings", "adductors", "calves"],
  core: ["abs", "obliques"],
} as const satisfies Record<MuscleGroupId, readonly MuscleId[]>;

export const strengthCopy = {
  headerTitle: "Strength tier",
  overallEyebrow: "Overall",
  overallSub: (ranked: number, groups: number) =>
    `From ${ranked} ranked ${ranked === 1 ? "lift" : "lifts"} across ${groups} ${groups === 1 ? "group" : "groups"}`,
  lockedTitle: "Locked",
  lockedSub: (rankedNeeded: number, groupsNeeded: number, progress: string) =>
    `Rank ${rankedNeeded} lifts across ${groupsNeeded} groups to unlock · ${progress}`,
  emptyTitle: "Unranked",
  emptySub: "Log a working set to start ranking your muscles.",
  bodyweightTitle: "Add your weight",
  bodyweightSub: "Tiers compare you with lifters of your bodyweight. Add it to rank your lifts.",
  bodyweightCta: "Add weight",
  groupsTitle: "Muscle groups",
  allTiers: "All tiers",
  unranked: "Unranked",
  errorTitle: "Couldn't load your tiers",
  retry: "Try again",

  /** S35 sheet. */
  progressTo: (label: string) => `Progress to ${label}`,
  nextEyebrow: "Next division",
  nextLine: (exercise: string, sessions: number, toLabel: string) =>
    `${exercise} · ${sessions} ${sessions === 1 ? "session" : "sessions"} → ${toLabel}`,
  contributorsTitle: "Contributing lifts",
  contributorDetail: (pct: number, muscle: string, best: string | null) =>
    best ? `${pct}% ${muscle} · best ${best}` : `${pct}% ${muscle}`,
  unrankedMuscle: (muscle: string) => `Log a lift that trains ${muscle} to rank it.`,
  topTier: "Top tier reached.",
  footnote: "Rest days never lower a tier.",

  /** S37 ladder. */
  ladderHeader: "Tiers",
  ladderEyebrow: "Strength ladder",
  ladderTitle: "Strength Tiers",
  ladderIntro:
    "Tiers come from your logged working sets, compared with lifters of your sex and bodyweight. Rest days never lower a tier.",
  divisionsTitle: "Divisions",
  divisionsNote: "Each tier has three divisions. III is the entry, I is the top.",
  ladderDivisions: "III · II · I",
  ladderTop: "Top tier",
  ladderYou: (label: string) => `You · ${label}`,

  /** You tab teaser. */
  teaserEyebrow: "Strength tier",
  teaserLocked: (progress: string) => `Locked · ${progress}`,
  teaserLine: "Every muscle ranked Iron → Legendary",
  teaserEmpty: "See your strength map",
} as const;
