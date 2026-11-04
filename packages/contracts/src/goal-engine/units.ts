/**
 * The engine computes in kg. These helpers convert at the edges (input forms,
 * labels, display) so imperial users see lb without changing any math.
 */
import type { GoalUnits } from "./types";

export const KG_PER_LB = 0.45359237;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

/** Display value in the user's unit, 1 decimal. */
export const displayWeight = (kg: number, units: GoalUnits): number => {
  const v = units === "imperial" ? kgToLb(kg) : kg;
  return Math.round(v * 10) / 10;
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** "78.5 kg" / "173.1 lb". */
export const formatWeight = (kg: number, units: GoalUnits): string =>
  `${fmt(displayWeight(kg, units))} ${units === "imperial" ? "lb" : "kg"}`;

/** Signed change: "−2.5 kg", "+2.2 lb". */
export const formatDelta = (kg: number, units: GoalUnits): string => {
  const v = displayWeight(Math.abs(kg), units);
  return `${kg < 0 ? "−" : "+"}${fmt(v)} ${units === "imperial" ? "lb" : "kg"}`;
};
