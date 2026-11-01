import type {
  MealAnalysisFields,
  MealAnalysisSource,
  MealEstimate,
  MealIngredient,
  MealSlot,
} from "@/lib/api";

/** Below this the result screen asks the user to check portions. */
export const LOW_CONFIDENCE = 0.6;

export type Macros = {
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
};

export type Micros = {
  readonly fiberG: number | null;
  readonly sugarG: number | null;
  readonly sodiumMg: number | null;
};

export type SnapIngredient = Macros & {
  readonly id: string;
  readonly name: string;
  readonly grams: number | null;
};

/**
 * Editable analysis. `base*` is what the model returned; edits are applied as a
 * delta on top so unlisted extras (oil, sauce) in the model total survive.
 */
export type SnapDraft = {
  readonly name: string;
  readonly slot: MealSlot;
  readonly source: MealAnalysisSource;
  readonly confidence: number;
  readonly notes: string | null;
  readonly warnings: readonly string[];
  readonly base: Macros;
  readonly baseMicros: Micros;
  readonly baseIngredients: readonly SnapIngredient[];
  readonly ingredients: readonly SnapIngredient[];
};

const ZERO: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export const slotForHour = (hour: number): MealSlot => {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
};

const toIngredient = (i: MealIngredient, index: number): SnapIngredient => ({
  id: `ing-${index}`,
  name: i.name,
  grams: typeof i.grams === "number" ? Math.round(i.grams) : null,
  kcal: i.kcal ?? 0,
  proteinG: i.proteinG ?? 0,
  carbsG: i.carbsG ?? 0,
  fatG: i.fatG ?? 0,
});

export const draftFromEstimate = (est: MealEstimate, slot: MealSlot): SnapDraft => {
  const ingredients = (est.ingredients ?? []).map(toIngredient);
  return {
    name: est.name,
    slot,
    source: est.source,
    confidence: est.confidence,
    notes: est.notes ?? null,
    warnings: est.warnings ?? [],
    base: {
      kcal: est.kcal,
      proteinG: est.proteinG,
      carbsG: est.carbsG,
      fatG: est.fatG,
    },
    baseMicros: {
      fiberG: est.fiberG ?? null,
      sugarG: est.sugarG ?? null,
      sodiumMg: est.sodiumMg ?? null,
    },
    baseIngredients: ingredients,
    ingredients,
  };
};

const sum = (list: readonly SnapIngredient[]): Macros =>
  list.reduce<Macros>(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    ZERO,
  );

const raw = (d: SnapDraft): Macros => {
  const now = sum(d.ingredients);
  const was = sum(d.baseIngredients);
  return {
    kcal: Math.max(0, d.base.kcal + now.kcal - was.kcal),
    proteinG: Math.max(0, d.base.proteinG + now.proteinG - was.proteinG),
    carbsG: Math.max(0, d.base.carbsG + now.carbsG - was.carbsG),
    fatG: Math.max(0, d.base.fatG + now.fatG - was.fatG),
  };
};

export const totalsOf = (d: SnapDraft): Macros => {
  const t = raw(d);
  return {
    kcal: Math.round(t.kcal),
    proteinG: Math.round(t.proteinG),
    carbsG: Math.round(t.carbsG),
    fatG: Math.round(t.fatG),
  };
};

/** Micros follow total energy so a smaller portion shrinks sodium etc. */
export const microsOf = (d: SnapDraft): Micros => {
  const ratio = d.base.kcal > 0 ? raw(d).kcal / d.base.kcal : 1;
  const scale = (v: number | null) => (v === null ? null : Math.round(v * ratio));
  return {
    fiberG: scale(d.baseMicros.fiberG),
    sugarG: scale(d.baseMicros.sugarG),
    sodiumMg: scale(d.baseMicros.sodiumMg),
  };
};

const scaleIngredient = (i: SnapIngredient, grams: number): SnapIngredient => {
  const ratio = i.grams && i.grams > 0 ? grams / i.grams : 1;
  return {
    ...i,
    grams,
    kcal: i.kcal * ratio,
    proteinG: i.proteinG * ratio,
    carbsG: i.carbsG * ratio,
    fatG: i.fatG * ratio,
  };
};

/** Set grams per ingredient id; `0` removes the row. */
export const withGrams = (d: SnapDraft, grams: Readonly<Record<string, number>>): SnapDraft => ({
  ...d,
  ingredients: d.ingredients
    .map((i) => (i.id in grams ? scaleIngredient(i, grams[i.id]!) : i))
    .filter((i) => i.grams === null || i.grams > 0),
});

export const withIngredient = (d: SnapDraft, i: Omit<SnapIngredient, "id">): SnapDraft => ({
  ...d,
  ingredients: [...d.ingredients, { ...i, id: `add-${d.ingredients.length}-${i.name}` }],
});

/** Fix sheet calorie override: scale every portion so totals land on `kcal`. */
export const withKcal = (d: SnapDraft, kcal: number): SnapDraft => {
  const now = raw(d).kcal;
  if (!(kcal > 0) || now <= 0) return d;
  const ratio = kcal / now;
  const scaleMacros = (m: Macros): Macros => ({
    kcal: m.kcal * ratio,
    proteinG: m.proteinG * ratio,
    carbsG: m.carbsG * ratio,
    fatG: m.fatG * ratio,
  });
  const scaleList = (list: readonly SnapIngredient[]) =>
    list.map((i) => ({
      ...i,
      ...scaleMacros(i),
      grams: i.grams === null ? null : Math.round(i.grams * ratio),
    }));
  return {
    ...d,
    base: scaleMacros(d.base),
    baseIngredients: scaleList(d.baseIngredients),
    ingredients: scaleList(d.ingredients),
  };
};

export const isLowConfidence = (d: SnapDraft): boolean => d.confidence < LOW_CONFIDENCE;

/** Share of energy from each macro (4/4/9 kcal per g), summing to ~100. */
export const macroShares = (t: Macros): { p: number; c: number; f: number } => {
  const p = t.proteinG * 4;
  const c = t.carbsG * 4;
  const f = t.fatG * 9;
  const all = p + c + f;
  if (all <= 0) return { p: 0, c: 0, f: 0 };
  return {
    p: Math.round((p / all) * 100),
    c: Math.round((c / all) * 100),
    f: Math.round((f / all) * 100),
  };
};

/** Payload fields for `POST /v1/meals` (analysis half). */
export const toAnalysisFields = (d: SnapDraft): MealAnalysisFields => {
  const micros = microsOf(d);
  return {
    fiberG: micros.fiberG,
    sugarG: micros.sugarG,
    sodiumMg: micros.sodiumMg,
    ingredients: d.ingredients.slice(0, 40).map((i) => ({
      name: i.name.slice(0, 120),
      ...(i.grams !== null ? { grams: i.grams } : {}),
      kcal: Math.round(i.kcal),
      proteinG: Math.round(i.proteinG),
      carbsG: Math.round(i.carbsG),
      fatG: Math.round(i.fatG),
    })),
    warnings: d.warnings.slice(0, 10).map((w) => w.slice(0, 300)),
    analysisStatus: "ready",
    analysisSource: d.source,
    estimateConfidence: d.confidence,
  };
};

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
