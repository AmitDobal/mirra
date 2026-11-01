import type { CheckInStatus, PlanWorkout } from "@/lib/api";

export type Energy = 1 | 2 | 3 | 4 | 5;
export type Sleep = "poor" | "ok" | "great";
export type Soreness = "none" | "some" | "very";
export type BodyArea = "shoulders" | "legs" | "back";
/** AI default proposal for today: Keep / Lighter / Short. */
export type AdjustMode = "keep" | "lighter" | "short";

export type CheckInInputs = {
  readonly energy: Energy;
  readonly sleep: Sleep;
  readonly soreness: Soreness;
  readonly areas: readonly BodyArea[];
};

export const ENERGY_LEVELS: readonly Energy[] = [1, 2, 3, 4, 5];
export const BODY_AREAS: readonly BodyArea[] = ["shoulders", "legs", "back"];

export const SLEEP_OPTIONS: readonly { readonly id: Sleep; readonly label: string }[] = [
  { id: "poor", label: "Poor" },
  { id: "ok", label: "OK" },
  { id: "great", label: "Great" },
];

export const SORENESS_OPTIONS: readonly { readonly id: Soreness; readonly label: string }[] = [
  { id: "none", label: "None" },
  { id: "some", label: "Some" },
  { id: "very", label: "Very" },
];

export const ENERGY_LABEL: Record<Energy, string> = {
  1: "Drained",
  2: "Low",
  3: "Steady",
  4: "High Voltage",
  5: "Peak",
};

export const SLEEP_LABEL: Record<Sleep, string> = {
  poor: "Rough night",
  ok: "Decent night",
  great: "Well rested",
};

export const AREA_LABEL: Record<BodyArea, string> = {
  shoulders: "Shoulders",
  legs: "Legs",
  back: "Back",
};

export const MODE_LABEL: Record<AdjustMode, string> = {
  lighter: "Lighter session",
  keep: "Keep plan",
  short: "20-min short",
};

export const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const sentenceCase = (s: string): string => titleCase(s.toLowerCase());

/** Right-hand caption on the soreness row. */
export const sorenessCaption = (soreness: Soreness, areas: readonly BodyArea[]): string => {
  if (soreness === "none") return "Feeling fresh";
  if (areas.length === 0) return "Tap an area";
  return `${areas.map((a) => AREA_LABEL[a]).join(", ")} targeted`;
};

/** Summary pill text on S20c ("Some soreness (Legs)"). */
export const sorenessSummary = (
  soreness: Soreness,
  areas: readonly BodyArea[],
): { readonly text: string; readonly detail: string | null } => {
  if (soreness === "none") return { text: "No soreness", detail: null };
  const text = `${titleCase(soreness)} soreness`;
  return { text, detail: areas.length ? areas.map((a) => AREA_LABEL[a]).join(", ") : null };
};

/** API enum has no "tap check-in" status; low-readiness signals map to the closest one. */
export const toApiStatus = (i: CheckInInputs): CheckInStatus => {
  if (i.soreness === "very") return "soreness";
  if (i.sleep === "poor") return "low_sleep";
  if (i.energy <= 2) return "partial";
  return "done";
};

/** Readable note stored with the check-in (no internal ids). */
export const buildNote = (
  i: CheckInInputs,
  note: string,
  hasPhoto: boolean,
): string => {
  const parts = [
    `Energy ${i.energy}/5`,
    `Sleep ${sentenceCase(i.sleep)}`,
    `Soreness ${sentenceCase(i.soreness)}${
      i.soreness !== "none" && i.areas.length ? ` (${i.areas.map((a) => AREA_LABEL[a]).join(", ")})` : ""
    }`,
  ];
  if (note.trim()) parts.push(`Note: ${note.trim()}`);
  if (hasPhoto) parts.push("Photo attached");
  return parts.join(" · ");
};

/** Deterministic default proposal; user can override with the pills. */
export const suggestMode = (i: CheckInInputs): AdjustMode => {
  if (i.energy <= 2 || i.soreness === "very") return "lighter";
  if (i.sleep === "poor" || (i.soreness === "some" && i.energy <= 3)) return "short";
  return "keep";
};

export type WorkoutDiff = {
  readonly title: string;
  readonly beforeMin: number;
  readonly afterMin: number;
  readonly detail: string;
  /** Plan estimates (not measured): share of planned work kept / change in expected fatigue. */
  readonly volumeMatchPct: number;
  readonly fatiguePct: number;
};

const SHORT_MINUTES = 20;
const LIGHTER_RATIO = 2 / 3;

const totalSets = (w: PlanWorkout): number =>
  w.exercises.reduce((sum, e) => sum + e.targetSets, 0);

/** Before → after for today's workout under a mode. `null` on a rest day. */
export const buildDiff = (workout: PlanWorkout | null, mode: AdjustMode): WorkoutDiff | null => {
  if (!workout) return null;
  const before = workout.durationMin;
  if (mode === "keep") {
    return {
      title: workout.title,
      beforeMin: before,
      afterMin: before,
      detail: "Full session as planned · No changes",
      volumeMatchPct: 100,
      fatiguePct: 0,
    };
  }
  if (mode === "short") {
    const after = Math.min(SHORT_MINUTES, before);
    return {
      title: workout.title,
      beforeMin: before,
      afterMin: after,
      detail: "Kept the top lifts · Trimmed the rest",
      volumeMatchPct: 70,
      fatiguePct: -30,
    };
  }
  const dropped = Math.max(1, Math.round(totalSets(workout) / 6));
  return {
    title: workout.title,
    beforeMin: before,
    afterMin: Math.max(10, Math.round(before * LIGHTER_RATIO)),
    detail: `Dropped ${dropped} heavy ${dropped === 1 ? "set" : "sets"} · Protected recovery window`,
    volumeMatchPct: 88,
    fatiguePct: -24,
  };
};
