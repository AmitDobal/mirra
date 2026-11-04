import { CUISINE_STYLE_IDS, type MealSlot } from "@mirra/contracts";

import type { PlanReviseIntent, PlanReviseMealBias } from "../ports/plan-reviser";
import { sanitizeAiCopy } from "./ai-copy";

export const EQUIPMENT_IDS = [
  "full_gym",
  "dumbbells",
  "barbell",
  "machines",
  "cables",
  "bands",
  "bodyweight",
  "home_minimal",
  "bench",
] as const;

export const emptyIntent = (): PlanReviseIntent => ({
  equipmentAdd: [],
  equipmentRemove: [],
  foodsAvoidAdd: [],
  dietTagsAdd: [],
  cuisineStylesAdd: [],
  forceMealRegen: false,
  reviseWorkout: false,
  mealSlots: [],
  exerciseSwaps: [],
  exerciseAdds: [],
  exerciseRemoves: [],
  preferExercises: [],
  scheduleMoves: [],
  reasons: {},
});

const uniq = (xs: string[]): string[] => [...new Set(xs)];

const SLOTS: readonly MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
const BIASES: readonly PlanReviseMealBias[] = ["high_protein", "low_carb", "lighter"];
const DAY_REF = /^(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*$|^\d{4}-\d{2}-\d{2}$|^(?:today|tomorrow)$/;
const REPS = /^[\d\- ]{1,12}$/;

const uniqCi = (xs: string[]): string[] => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** Exercise name from model/regex output: letters, digits, spaces, - and '; 2-60 chars. */
const exName = (x: unknown): string | null => {
  if (typeof x !== "string") return null;
  const s = x.replace(/[^\p{L}\p{N} '-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return s.length >= 2 ? s : null;
};

const names = (xs: unknown): string[] =>
  Array.isArray(xs) ? uniqCi(xs.map(exName).filter((x): x is string => x != null)).slice(0, 6) : [];

const dayRef = (x: unknown): string | null =>
  typeof x === "string" && DAY_REF.test(x.trim().toLowerCase()) ? x.trim().toLowerCase() : null;

const clampInt = (n: unknown, lo: number, hi: number): number | undefined =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : undefined;

type V2 = Pick<
  PlanReviseIntent,
  | "mealSlots"
  | "mealBias"
  | "exerciseSwaps"
  | "exerciseAdds"
  | "exerciseRemoves"
  | "preferExercises"
  | "scheduleMoves"
  | "reasons"
>;

/** Clamp the v2 fields (slots, exercise edits, schedule moves, reasons). */
const sanitizeV2 = (raw: Partial<PlanReviseIntent>): V2 => {
  const exerciseSwaps = (raw.exerciseSwaps ?? [])
    .map((sw) => ({ from: exName(sw?.from), to: exName(sw?.to) }))
    .filter((sw): sw is { from: string; to: string | null } => sw.from != null)
    .slice(0, 6);
  const exerciseAdds: V2["exerciseAdds"] = [];
  for (const a of raw.exerciseAdds ?? []) {
    const name = exName(a?.name);
    if (!name || exerciseAdds.length >= 6) continue;
    const sets = clampInt(a.sets, 1, 8);
    const reps = typeof a.reps === "string" && REPS.test(a.reps.trim()) ? a.reps.trim() : undefined;
    exerciseAdds.push({ name, ...(sets ? { sets } : {}), ...(reps ? { reps } : {}) });
  }
  const scheduleMoves = (raw.scheduleMoves ?? [])
    .map((m) => ({ from: dayRef(m?.from), to: dayRef(m?.to) }))
    .filter((m): m is { from: string; to: string } => m.from != null && m.to != null && m.from !== m.to)
    .slice(0, 3);
  const reasons: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.reasons ?? {}).slice(0, 12)) {
    if (typeof v !== "string" || k.length > 60) continue;
    const text = sanitizeAiCopy(v).trim().slice(0, 80);
    if (text) reasons[k.toLowerCase()] = text;
  }
  const preferExercises = names(raw.preferExercises);
  if (raw.preferBench && !preferExercises.some((n) => /bench/i.test(n))) preferExercises.push("Bench press");
  const mealBias = BIASES.find((b) => b === raw.mealBias);
  return {
    mealSlots: SLOTS.filter((s) => (raw.mealSlots ?? []).includes(s)),
    ...(mealBias ? { mealBias } : {}),
    exerciseSwaps,
    exerciseAdds,
    exerciseRemoves: names(raw.exerciseRemoves),
    preferExercises,
    scheduleMoves,
    reasons,
  };
};

/** Clamp model/heuristic output to known ids and sane numbers. */
export const sanitizeIntent = (raw: Partial<PlanReviseIntent>): PlanReviseIntent => {
  const known = new Set<string>(EQUIPMENT_IDS);
  const equip = (xs?: string[]) => uniq((xs ?? []).filter((x) => known.has(x)));
  const words = (xs?: string[]) =>
    uniq(
      (xs ?? [])
        .map((x) => x.toLowerCase().replace(/[^a-z ]/g, "").trim())
        .filter((x) => x.length >= 3 && x.length <= 30),
    ).slice(0, 8);
  const meals = clampInt(raw.mealsPerDay, 1, 4);
  const shorten = clampInt(raw.shortenMin, 10, 90);
  const v2 = sanitizeV2(raw);
  const bench = Boolean(raw.preferBench) || v2.preferExercises.some((n) => /bench/i.test(n));
  return {
    equipmentAdd: equip(raw.equipmentAdd),
    equipmentRemove: equip(raw.equipmentRemove),
    foodsAvoidAdd: words(raw.foodsAvoidAdd),
    dietTagsAdd: uniq(
      (raw.dietTagsAdd ?? []).filter((t) =>
        ["vegetarian", "vegan", "dairy_free", "gluten_free", "halal", "high_protein"].includes(t),
      ),
    ),
    cuisineStylesAdd: uniq(
      (raw.cuisineStylesAdd ?? []).filter((c) => (CUISINE_STYLE_IDS as readonly string[]).includes(c)),
    ),
    ...(raw.cuisineStylesOnly ? { cuisineStylesOnly: true } : {}),
    forceMealRegen: Boolean(raw.forceMealRegen),
    reviseWorkout: Boolean(raw.reviseWorkout),
    // Legacy flag kept in sync until AMI-166 drops it from workout-revise.
    ...(bench ? { preferBench: true } : {}),
    ...(shorten ? { shortenMin: shorten } : {}),
    ...(meals ? { mealsPerDay: meals } : {}),
    ...v2,
  };
};

export const hasMealIntent = (i: PlanReviseIntent): boolean =>
  i.forceMealRegen ||
  i.foodsAvoidAdd.length > 0 ||
  i.dietTagsAdd.length > 0 ||
  i.cuisineStylesAdd.length > 0 ||
  i.mealsPerDay != null ||
  i.mealSlots.length > 0;

export const hasWorkoutIntent = (i: PlanReviseIntent): boolean =>
  i.reviseWorkout ||
  i.equipmentAdd.length > 0 ||
  i.equipmentRemove.length > 0 ||
  Boolean(i.preferBench) ||
  i.shortenMin != null ||
  i.exerciseSwaps.length > 0 ||
  i.exerciseAdds.length > 0 ||
  i.exerciseRemoves.length > 0 ||
  i.preferExercises.length > 0 ||
  i.scheduleMoves.length > 0;

export const hasAnyIntent = (i: PlanReviseIntent): boolean =>
  hasMealIntent(i) || hasWorkoutIntent(i);
