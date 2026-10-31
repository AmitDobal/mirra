import type { GeneratedExercise } from "../ports/plan-generator";

/** Equipment ids from onboarding (`full_gym`, `dumbbells`, ...). */
type EquipmentSet = ReadonlySet<string>;

type Variant = { name: string; anyOf: readonly string[] };

const LOADED = ["full_gym", "barbell", "dumbbells", "machines"];
const PULLING = ["full_gym", "barbell", "dumbbells", "cables", "machines", "bands"];
const ARMS = ["full_gym", "dumbbells", "cables", "bands", "barbell"];

/**
 * Exercise name → ordered variants. First variant whose equipment is available wins;
 * an empty `anyOf` is bodyweight (always available). Unlisted names pass through untouched.
 */
const VARIANTS: Record<string, readonly Variant[]> = {
  "Overhead press": [
    { name: "Overhead press", anyOf: LOADED },
    { name: "Band overhead press", anyOf: ["bands"] },
    { name: "Pike push-up", anyOf: [] },
  ],
  "Tricep extension": [
    { name: "Tricep extension", anyOf: ["full_gym", "cables", "dumbbells", "bands"] },
    { name: "Bench dip", anyOf: [] },
  ],
  Row: [
    { name: "Row", anyOf: PULLING },
    { name: "Inverted / towel row", anyOf: [] },
  ],
  "Lat pulldown / pull-up": [
    { name: "Lat pulldown", anyOf: ["full_gym", "machines", "cables"] },
    { name: "Band pull-down", anyOf: ["bands"] },
    { name: "Pull-up (or doorway row)", anyOf: [] },
  ],
  "Face pull": [
    { name: "Face pull", anyOf: ["full_gym", "cables", "bands"] },
    { name: "Reverse snow angel", anyOf: [] },
  ],
  Squat: [
    { name: "Squat", anyOf: ["full_gym", "barbell", "machines"] },
    { name: "Goblet squat", anyOf: ["dumbbells"] },
    { name: "Tempo bodyweight squat", anyOf: [] },
  ],
  "Romanian deadlift": [
    { name: "Romanian deadlift", anyOf: ["full_gym", "barbell", "dumbbells"] },
    { name: "Band good morning", anyOf: ["bands"] },
    { name: "Single-leg hip hinge", anyOf: [] },
  ],
  "Goblet squat": [
    { name: "Goblet squat", anyOf: ["full_gym", "dumbbells"] },
    { name: "Tempo bodyweight squat", anyOf: [] },
  ],
  "Bench / floor press": [
    { name: "Bench / floor press", anyOf: LOADED },
    { name: "Band chest press", anyOf: ["bands"] },
    { name: "Decline push-up", anyOf: [] },
  ],
  "Lateral raise": [
    { name: "Lateral raise", anyOf: ["full_gym", "dumbbells", "cables", "bands"] },
    { name: "Plank shoulder tap", anyOf: [] },
  ],
  "Curl + extension superset": [
    { name: "Curl + extension superset", anyOf: ARMS },
    { name: "Chin-up hold + bench dip", anyOf: [] },
  ],
  "Front squat / goblet": [
    { name: "Front squat", anyOf: ["full_gym", "barbell"] },
    { name: "Goblet squat", anyOf: ["dumbbells"] },
    { name: "Tempo bodyweight squat", anyOf: [] },
  ],
  "Hip hinge": [
    { name: "Romanian deadlift", anyOf: ["full_gym", "barbell", "dumbbells"] },
    { name: "Band pull-through", anyOf: ["bands"] },
    { name: "Glute bridge", anyOf: [] },
  ],
};

const SEX_BANDS = {
  female: { base: 28, cut: 24, build: 32, protein: 1.9 },
  male: { base: 30, cut: 26, build: 34, protein: 1.8 },
  /** Mid band (average of M/F) for unspecified / prefer_not / missing sex. */
  neutral: { base: 29, cut: 25, build: 33, protein: 1.85 },
} as const;

/** `unspecified`, `prefer_not`, null → neutral mid band; never silently male. */
export const sexBand = (sex: string | null | undefined) =>
  sex === "female" ? SEX_BANDS.female : sex === "male" ? SEX_BANDS.male : SEX_BANDS.neutral;

/** Empty equipment (unknown) means no filtering. `full_gym` unlocks everything. */
const hasEquipment = (owned: EquipmentSet, anyOf: readonly string[]): boolean =>
  anyOf.length === 0 || owned.size === 0 || anyOf.some((e) => owned.has(e));

/** Swap each exercise for the best variant the user's equipment allows. */
export const fitToEquipment = (
  exercises: readonly GeneratedExercise[],
  equipment: readonly string[] | undefined,
): GeneratedExercise[] => {
  const owned = new Set(equipment ?? []);
  return exercises.map((ex) => {
    const variant = VARIANTS[ex.name]?.find((v) => hasEquipment(owned, v.anyOf));
    return variant ? { ...ex, name: variant.name } : { ...ex };
  });
};

const MAX_BY_MINUTES = (minutes: number): number => (minutes <= 20 ? 3 : minutes <= 30 ? 4 : 6);

type ScaleOpts = { experience?: string; ageYears?: number | null; minutes: number };

/** Scale sets/rest by experience and age, and trim to the session length. */
export const scaleVolume = (
  exercises: readonly GeneratedExercise[],
  { experience, ageYears, minutes }: ScaleOpts,
): GeneratedExercise[] => {
  const setDelta = experience === "new" ? -1 : experience === "y3_plus" ? 1 : 0;
  const ageRest = ageYears != null && ageYears >= 50 ? 30 : ageYears != null && ageYears >= 40 ? 15 : 0;
  const setCap = ageYears != null && ageYears < 18 ? 3 : 5;
  const restBump = (experience === "new" ? 15 : 0) + ageRest;

  return exercises.slice(0, MAX_BY_MINUTES(minutes)).map((ex) => {
    const compound = ex.targetSets >= 3;
    const sets = compound ? ex.targetSets + setDelta : ex.targetSets;
    return {
      ...ex,
      targetSets: Math.min(setCap, Math.max(2, sets)),
      restSec: ex.restSec != null ? ex.restSec + restBump : undefined,
    };
  });
};

/** Short coaching hint appended to the plan outcome line. */
export const ageRecoveryHint = (ageYears: number | null | undefined): string => {
  if (ageYears == null) return "";
  if (ageYears >= 50) return " Extra rest between sets for recovery.";
  if (ageYears >= 40) return " Slightly longer rests to protect recovery.";
  if (ageYears < 18) return " Moderate volume while you grow.";
  return "";
};

const cap = (id: string): string => id[0]!.toUpperCase() + id.slice(1).replace(/_/g, " ");

/** "Indian, Thai-style fuel." — empty when only "other"/nothing is chosen. */
export const cuisineHint = (cuisineStyles: readonly string[] | undefined): string => {
  const named = (cuisineStyles ?? []).filter((c) => c !== "other");
  return named.length ? ` Fuel leans ${named.map(cap).join(" / ")}.` : "";
};
