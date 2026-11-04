/**
 * Live HUD load stepper units (AMI-169). The store always keeps kg; imperial
 * users see and type lb. Bodyweight lifts log *added* load ("+ kg added").
 * Pure: node tests import it directly.
 */
export type LoadUnit = "kg" | "lb";
export type LoadScoring = "load" | "bodyweight" | "reps" | "time";

export const KG_PER_LB = 0.45359237;

export const unitFor = (units: string | null | undefined): LoadUnit =>
  units === "imperial" ? "lb" : "kg";

/**
 * Stepper caption: "KG" / "LB", "+ kg added" / "+ lb added" for bodyweight lifts, and
 * "KG PER HAND" for dumbbell lifts (one dumbbell is logged, AMI-183; server scores per hand).
 */
export const loadLabel = (
  unit: LoadUnit,
  scoring: LoadScoring | null | undefined,
  perHand = false,
): string => {
  if (scoring === "bodyweight") return `+ ${unit} added`;
  return perHand ? `${unit.toUpperCase()} PER HAND` : unit.toUpperCase();
};

/** kg → shown value: kg to 0.01, lb to the nearest 0.5. */
export const toDisplayLoad = (kg: number, unit: LoadUnit): number =>
  unit === "kg" ? kg : Math.round((kg / KG_PER_LB) * 2) / 2;

/** Shown value → kg for the store. */
export const fromDisplayLoad = (value: number, unit: LoadUnit): number =>
  unit === "kg" ? value : value * KG_PER_LB;

/** One ± tap in kg: 2.5 kg, or 5 lb. */
export const loadStepKg = (unit: LoadUnit): number => (unit === "kg" ? 2.5 : 5 * KG_PER_LB);

/** "100" / "187.5" for set chips in the user's unit. */
export const formatLoad = (kg: number, unit: LoadUnit): string => {
  const v = toDisplayLoad(kg, unit);
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
};
