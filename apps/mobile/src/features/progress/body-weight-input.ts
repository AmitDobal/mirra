/**
 * Log-weight sheet units (AMI-183). The API and stores always take kg;
 * imperial users see and type lb. Pure: node tests import it directly.
 */
import { KG_PER_LB, type LoadUnit } from "@/features/workout/load-units";

import { parseKgInput } from "./weight-journey";

export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 400;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** kg → the text prefilled in the field: kg or lb to 0.1 ("76", "167.6"). */
export const weightInputText = (kg: number | null, unit: LoadUnit): string => {
  if (kg === null || !Number.isFinite(kg)) return "";
  return String(round1(unit === "kg" ? kg : kg / KG_PER_LB));
};

/** Typed text in `unit` → kg (0.01), or null when empty / not a number. */
export const parseWeightInput = (raw: string, unit: LoadUnit): number | null => {
  const n = parseKgInput(raw);
  if (n === null) return null;
  return unit === "kg" ? n : Math.round(n * KG_PER_LB * 100) / 100;
};

/** Valid range in the user's unit, for the error line. */
export const weightRangeText = (unit: LoadUnit): string =>
  unit === "kg"
    ? `${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`
    : `${Math.ceil(WEIGHT_MIN_KG / KG_PER_LB)} and ${Math.floor(WEIGHT_MAX_KG / KG_PER_LB)} lb`;

/** kg when inside the allowed range, else null. */
export const validWeightKg = (raw: string, unit: LoadUnit): number | null => {
  const kg = parseWeightInput(raw, unit);
  return kg === null || kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG ? null : kg;
};
