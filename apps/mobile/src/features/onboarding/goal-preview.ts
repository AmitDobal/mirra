/**
 * Store answers → goal engine (AMI-180). Pure, no RN imports (`node --test`).
 * The engine always gets kg; display converts with `weightUnit`.
 */
import { previewGoal, type GoalPreviewAnswers, type GoalProjection } from "@mirra/contracts";

import { shortDate, weightChange, weightDeltaBetween, weightText, ratePerWeek, type WeightUnit } from "@/features/goal/goal-format";

import { EXP_MAP, GOAL_MAP } from "./map-body";
import type { OnboardingAnswers, PaceId } from "./types";

export type GoalSource = Pick<
  OnboardingAnswers,
  | "goal"
  | "experience"
  | "sex"
  | "age"
  | "heightCm"
  | "weightKg"
  | "goalWeightKg"
  | "pace"
  | "trainingDays"
  | "weightUnit"
>;

const SEX = { female: "female", male: "male", prefer_not: "unspecified" } as const;

/** Never throws: S06 runs before every answer exists (sex may still be null). */
export const toGoalPreviewAnswers = (a: GoalSource, overrides: Partial<GoalSource> = {}): GoalPreviewAnswers => {
  const s = { ...a, ...overrides };
  const trainDays = s.trainingDays.map((on, i) => (on ? i + 1 : 0)).filter((d) => d > 0);
  return {
    profile: {
      sex: s.sex ? SEX[s.sex] : null,
      ageYears: s.age,
      heightCm: s.heightCm,
      weightKg: s.weightKg,
      goalWeightKg: s.goalWeightKg,
      pace: s.pace,
    },
    preferences: {
      primaryGoal: GOAL_MAP[s.goal ?? "build_muscle"],
      experience: EXP_MAP[s.experience ?? "new"],
      // Same default as `toOnboardingBody` so the preview matches what the API stores.
      trainDays: trainDays.length ? trainDays : [1, 3, 5],
      // Engine milestone labels follow the weight unit the user sees on S06/S43.
      units: s.weightUnit === "lb" ? "imperial" : "metric",
    },
  };
};

export const sessionsPerWeek = (trainingDays: readonly boolean[]): number =>
  trainingDays.filter(Boolean).length || 3;

/** Timeline shape the UI renders: a dated ETA, a 12-week line, or a hold band. */
export type TimelineKind = "eta" | "horizon" | "hold";

export const timelineKind = (p: GoalProjection): TimelineKind => {
  if (p.mode === "milestones" || p.direction === "hold") return "hold";
  return p.mode === "eta" && p.band.expected ? "eta" : "horizon";
};

export type TargetPaceView = {
  readonly direction: GoalProjection["direction"];
  readonly rates: Record<PaceId, string | null>;
  /** "~18" weeks for the selected pace; null without a dated ETA. */
  readonly weeks: number | null;
  readonly current: string;
  readonly overall: string | null;
  readonly minor: boolean;
};

/** S06: per-pace rate on each option + week count for the selected pace (live). */
export const buildTargetPaceView = (a: GoalSource, goalWeightKg: number, today: string): TargetPaceView => {
  const unit: WeightUnit = a.weightUnit;
  const at = (pace: PaceId) => previewGoal(toGoalPreviewAnswers(a, { goalWeightKg, pace }), today);
  const steady = at("steady");
  const aggressive = at("aggressive");
  const selected = a.pace === "aggressive" ? aggressive : steady;
  const moving = selected.direction !== "hold";
  const rate = (p: GoalProjection) => (moving && p.paceRateKg > 0 ? ratePerWeek(p.paceRateKg, unit) : null);
  const weeks = timelineKind(selected) === "eta" ? selected.band.weeksExpected : null;
  const delta = goalWeightKg - a.weightKg;
  return {
    direction: selected.direction,
    rates: { steady: rate(steady), aggressive: rate(aggressive) },
    weeks: weeks === null ? null : Math.max(1, Math.round(weeks)),
    current: weightText(a.weightKg, unit),
    overall: Math.abs(delta) >= 0.05 ? weightDeltaBetween(a.weightKg, goalWeightKg, unit) : null,
    minor: aggressive.flags.includes("minor_pace"),
  };
};

/** S12: "At this pace, ~7 kg by around Mar 6" parts; null → keep the plan's outcome line. */
export const weekRevealPaceLine = (
  p: GoalProjection,
  unit: WeightUnit,
): { readonly amount: string; readonly date: string } | null => {
  if (timelineKind(p) !== "eta" || p.startWeightKg === null || p.targetEffectiveKg === null) return null;
  return {
    amount: weightChange(p.startWeightKg, p.targetEffectiveKg, unit),
    date: shortDate(p.band.expected!),
  };
};
