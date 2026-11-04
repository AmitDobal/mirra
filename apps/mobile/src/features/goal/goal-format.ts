/**
 * Goal display formatting (pure, no RN imports → `node --test`). Engine values are kg
 * and `YYYY-MM-DD`; these helpers convert at the edge. Shared by S06/S12/S43 and AMI-182.
 */
import { kgToLb, lbToKg } from "@mirra/contracts";

import { goalCopy } from "@/content/goal";

export type WeightUnit = "kg" | "lb";
export type GoalUnits = "metric" | "imperial";

export const unitsFor = (unit: WeightUnit): GoalUnits => (unit === "lb" ? "imperial" : "metric");

const trim1 = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/** Headline / summary number: lb whole (matches the S06 stepper), kg to 0.1. */
export const weightNumber = (kg: number, unit: WeightUnit): string =>
  unit === "lb" ? String(Math.round(kgToLb(kg))) : trim1(kg);

/** "82 kg" / "181 lb". */
export const weightText = (kg: number, unit: WeightUnit): string => `${weightNumber(kg, unit)} ${unit}`;

/** "82 → 75 kg". */
export const weightPair = (fromKg: number, toKg: number, unit: WeightUnit): string =>
  `${weightNumber(fromKg, unit)} → ${weightNumber(toKg, unit)} ${unit}`;

/** Signed change at 0.1 precision: "−6.4 kg", "+2.2 lb". */
export const weightDelta = (kg: number, unit: WeightUnit): string => {
  const v = unit === "lb" ? kgToLb(Math.abs(kg)) : Math.abs(kg);
  return `${kg < 0 ? "−" : "+"}${trim1(v)} ${unit}`;
};

/** "−16 lb" from the two numbers the user sees (lb rounds each side, so the sum adds up). */
export const weightDeltaBetween = (fromKg: number, toKg: number, unit: WeightUnit): string =>
  unit === "lb"
    ? weightDelta(lbToKg(Math.round(kgToLb(toKg)) - Math.round(kgToLb(fromKg))), unit)
    : weightDelta(toKg - fromKg, unit);

/** Absolute change in whole units for "~7 kg" (lb: difference of the rounded numbers shown). */
export const weightChange = (fromKg: number, toKg: number, unit: WeightUnit): string => {
  const v = unit === "lb" ? Math.round(kgToLb(toKg)) - Math.round(kgToLb(fromKg)) : toKg - fromKg;
  return `${Math.max(1, Math.round(Math.abs(v)))} ${unit}`;
};

/** "~0.5 kg / week". */
export const ratePerWeek = (kgPerWeek: number, unit: WeightUnit): string => {
  const v = unit === "lb" ? kgToLb(kgPerWeek) : kgPerWeek;
  return `~${trim1(v)} ${unit} ${goalCopy.perWeek}`;
};

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
};

/** "2027-03-06" → "Mar 6" (string math, no `Date` / time zone). */
export const shortDate = (iso: string): string => {
  const [, m, d] = parts(iso);
  return `${goalCopy.months[m - 1] ?? ""} ${d}`;
};

/** "Feb 16 – Apr 26". */
export const dateRange = (from: string, to: string): string => `${shortDate(from)} – ${shortDate(to)}`;

/** "NOV" for chart axes. */
export const monthCaps = (month1to12: number): string =>
  (goalCopy.months[(month1to12 - 1 + 12) % 12] ?? "").toUpperCase();

/** "~18". */
export const weeksApprox = (weeks: number): string => `~${Math.max(1, Math.round(weeks))}`;

/** Local calendar date of a JS `Date` as `YYYY-MM-DD`. */
export const localIsoDate = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
