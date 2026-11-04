/**
 * Edit-sheet specs for S41 chevron rows (AMI-176). Pure: field + current values in,
 * sheet controls + PATCH /v1/me/profile body out. Diet / cuisines / foods-to-avoid use DietPrefsSheet.
 */
import { profileCopy as c } from "../../content/profile";

import {
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  type PrefsSource,
  type ProfileRowId,
  type ProfileSource,
  type Units,
} from "./profile-format";

export type Option = { readonly id: string | number; readonly label: string };

export type FieldSpec =
  | { kind: "choice"; options: readonly Option[]; nullable?: boolean }
  | { kind: "multi"; options: readonly Option[]; min: number; days?: boolean }
  | { kind: "number"; min: number; max: number; step: number; suffix: string; nullable?: boolean }
  | { kind: "height" }
  | { kind: "text"; max: number };

/** Draft value held by the sheet while editing. */
export type Draft = {
  readonly choice?: string | number | null;
  readonly multi?: readonly (string | number)[];
  readonly num?: number | null;
  readonly ft?: number;
  readonly inch?: number;
  readonly text?: string;
};

const opts = (map: Readonly<Record<string, string>>): Option[] =>
  Object.entries(map).map(([id, label]) => ({ id, label }));

export type EditableField = Exclude<ProfileRowId, "dietTags" | "cuisineStyles" | "foodsAvoid">;

export const isSheetField = (id: ProfileRowId): id is EditableField =>
  id !== "dietTags" && id !== "cuisineStyles" && id !== "foodsAvoid";

const weightSpec = (units: Units, nullable: boolean): FieldSpec =>
  units === "imperial"
    ? { kind: "number", min: 66, max: 880, step: 1, suffix: "lb", nullable }
    : { kind: "number", min: 30, max: 400, step: 0.5, suffix: "kg", nullable };

export const fieldSpec = (id: EditableField, units: Units): FieldSpec => {
  switch (id) {
    case "sex": return { kind: "choice", options: opts(c.sex) };
    case "ageYears": return { kind: "number", min: 13, max: 100, step: 1, suffix: "yrs" };
    case "heightCm":
      return units === "imperial" ? { kind: "height" } : { kind: "number", min: 120, max: 250, step: 1, suffix: "cm" };
    case "weightKg": return weightSpec(units, false);
    case "goalWeightKg": return weightSpec(units, true);
    case "pace": return { kind: "choice", options: opts(c.pace) };
    case "units": return { kind: "choice", options: opts(c.units) };
    case "primaryGoal": return { kind: "choice", options: opts(c.goal) };
    case "physiqueTarget": return { kind: "choice", options: opts(c.physique), nullable: true };
    case "experience": return { kind: "choice", options: opts(c.experience) };
    case "trainDays":
      return { kind: "multi", min: 1, days: true, options: c.dayLetters.map((l, i) => ({ id: i + 1, label: l })) };
    case "sessionMinutes": return { kind: "choice", options: c.sessionMinutes.map((m) => ({ id: m, label: `${m} min` })) };
    case "equipment": return { kind: "multi", min: 0, options: opts(c.equipment) };
    case "lifestyleNotes": return { kind: "text", max: 2000 };
    case "mealsPerDay": return { kind: "choice", options: c.mealsPerDay.map((m) => ({ id: m, label: String(m) })) };
  }
};

const toShownWeight = (kg: number | null | undefined, units: Units): number | null =>
  kg == null ? null : units === "imperial" ? Math.round(kgToLb(kg)) : Math.round(kg * 2) / 2;

/** Sheet starting value from the current profile + prefs. */
export const initialDraft = (id: EditableField, units: Units, p: ProfileSource | null, q: PrefsSource | null): Draft => {
  switch (id) {
    case "sex": return { choice: p?.sex ?? null };
    case "ageYears": return { num: p?.ageYears ?? 30 };
    case "heightCm":
      return units === "imperial" ? cmToFtIn(p?.heightCm ?? 175) : { num: Math.round(p?.heightCm ?? 175) };
    case "weightKg": return { num: toShownWeight(p?.weightKg ?? 75, units) };
    case "goalWeightKg": return { num: toShownWeight(p?.goalWeightKg, units) };
    case "pace": return { choice: p?.pace ?? null };
    case "units": return { choice: units };
    case "primaryGoal": return { choice: q?.primaryGoal ?? null };
    case "physiqueTarget": return { choice: q?.physiqueTarget ?? null };
    case "experience": return { choice: q?.experience ?? null };
    case "trainDays": return { multi: [...(q?.trainDays ?? [])] };
    case "sessionMinutes": return { choice: q?.sessionMinutes ?? 45 };
    case "equipment": return { multi: [...(q?.equipment ?? [])] };
    case "lifestyleNotes": return { text: q?.lifestyleNotes ?? "" };
    case "mealsPerDay": return { choice: q?.mealsPerDay ?? 4 };
  }
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Draft → PATCH body (metric). `weightKg` is returned as-is: the screen logs it via the weight store.
 * Returns null when the draft is not valid yet (e.g. no choice, zero training days).
 */
export const draftToPatch = (id: EditableField, units: Units, d: Draft): Record<string, unknown> | null => {
  const spec = fieldSpec(id, units);
  if (spec.kind === "choice") {
    if (d.choice == null) return spec.nullable ? { [id]: null } : null;
    return { [id]: d.choice };
  }
  if (spec.kind === "multi") {
    const list = [...(d.multi ?? [])];
    if (list.length < spec.min) return null;
    return { [id]: spec.days ? [...list].map(Number).sort((a, b) => a - b) : list };
  }
  if (spec.kind === "text") return { [id]: (d.text ?? "").trim().slice(0, spec.max) || null };
  if (spec.kind === "height") return { heightCm: ftInToCm(clamp(d.ft ?? 0, 4, 8), clamp(d.inch ?? 0, 0, 11)) };
  if (d.num == null || !Number.isFinite(d.num)) return spec.nullable ? { [id]: null } : null;
  const n = clamp(d.num, spec.min, spec.max);
  if (id === "ageYears") return { ageYears: Math.round(n) };
  if (id === "heightCm") return { heightCm: Math.round(n) };
  return { [id]: round1(units === "imperial" ? lbToKg(n) : n) };
};
