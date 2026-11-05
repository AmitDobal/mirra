/**
 * AMI-184: OpenAI meal-plan output schema + repair. Pure.
 *
 * The old adapter threw the whole reply away (→ heuristic) on any single slip: an unknown or
 * avoided foodId, an extra or repeated slot, a missing slot, >6 items, a long title. Now the
 * request uses strict `json_schema` (slot and foodId are enums), and `repairMealDraft` keeps
 * every meal that is still valid after dropping bad items. Missing slots are left for the
 * caller (`meal-plan-draft.ts` fills them with the heuristic for that slot only).
 */
import type { MealSlot } from "@mirra/contracts";

import type { MealPlanDraftMeal, MealPlanInput } from "../ports/meal-plan-generator";

export const MAX_CATALOG_ROWS = 120;
const MAX_ITEMS = 6;
const MAX_GRAMS = 2000;

/** Food ids the model may use: the prompt's catalog slice minus avoided foods. */
export const promptFoodIds = (input: MealPlanInput): string[] => {
  const avoid = new Set(input.avoidFoodIds);
  return input.catalog.slice(0, MAX_CATALOG_ROWS).map((r) => r.id).filter((id) => !avoid.has(id));
};

/** Strict structured-output schema (all fields required, no extra keys). Null → JSON mode. */
export const mealPlanJsonSchema = (input: MealPlanInput): Record<string, unknown> | null => {
  const ids = promptFoodIds(input);
  if (ids.length === 0 || input.slots.length === 0) return null;
  const item = {
    type: "object",
    additionalProperties: false,
    required: ["foodId", "grams"],
    properties: { foodId: { type: "string", enum: ids }, grams: { type: "number" } },
  };
  const meal = {
    type: "object",
    additionalProperties: false,
    required: ["slot", "title", "items"],
    properties: {
      slot: { type: "string", enum: [...new Set(input.slots)] },
      title: { type: "string" },
      items: { type: "array", items: item },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["meals"],
    properties: { meals: { type: "array", items: meal } },
  };
};

export type MealRepair = {
  meals: MealPlanDraftMeal[];
  /** What was fixed or dropped (logged by the adapter). */
  fixes: string[];
  missingSlots: MealSlot[];
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const slotOf = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase().replace(/s$/, "") : "");

const gramsOf = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_GRAMS, n) : null;
};

/** Exact id, then case-insensitive id, then exact catalog name ("Chicken breast"). */
const resolverFor = (input: MealPlanInput) => {
  const avoid = new Set(input.avoidFoodIds);
  const byKey = new Map<string, string>();
  for (const r of input.catalog) {
    if (avoid.has(r.id)) continue;
    byKey.set(r.id, r.id);
    byKey.set(r.id.toLowerCase(), r.id);
    if (!byKey.has(r.name.toLowerCase())) byKey.set(r.name.toLowerCase(), r.id);
  }
  return (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    return byKey.get(v) ?? byKey.get(v.trim().toLowerCase()) ?? null;
  };
};

const repairItems = (raw: unknown, resolve: (v: unknown) => string | null, slot: string, fixes: string[]) => {
  const items = new Map<string, number>();
  for (const it of Array.isArray(raw) ? raw : []) {
    const r = asRecord(it);
    const foodId = resolve(r?.foodId ?? r?.id);
    const grams = gramsOf(r?.grams);
    if (!foodId || grams === null) {
      fixes.push(`${slot}: dropped item ${JSON.stringify(r?.foodId ?? it).slice(0, 40)}`);
      continue;
    }
    items.set(foodId, Math.min(MAX_GRAMS, (items.get(foodId) ?? 0) + grams));
  }
  const out = [...items].map(([foodId, grams]) => ({ foodId, grams }));
  if (out.length > MAX_ITEMS) fixes.push(`${slot}: kept ${MAX_ITEMS} of ${out.length} items`);
  return out.slice(0, MAX_ITEMS);
};

export const repairMealDraft = (raw: unknown, input: MealPlanInput): MealRepair => {
  const fixes: string[] = [];
  const wanted = new Set<string>(input.slots);
  const resolve = resolverFor(input);
  const meals: MealPlanDraftMeal[] = [];
  const rawMeals = asRecord(raw)?.meals;
  if (!Array.isArray(rawMeals)) fixes.push("no meals array");
  for (const m of Array.isArray(rawMeals) ? rawMeals : []) {
    const r = asRecord(m);
    const slot = slotOf(r?.slot);
    if (!wanted.has(slot)) {
      fixes.push(`dropped meal for slot ${JSON.stringify(r?.slot ?? null)}`);
      continue;
    }
    if (meals.some((x) => x.slot === slot)) {
      fixes.push(`dropped repeat ${slot}`);
      continue;
    }
    const items = repairItems(r?.items, resolve, slot, fixes);
    if (items.length === 0) {
      fixes.push(`${slot}: no valid items`);
      continue;
    }
    const title = typeof r?.title === "string" && r.title.trim() ? r.title.trim().slice(0, 80) : "Planned meal";
    meals.push({ slot: slot as MealSlot, title, items });
  }
  const missingSlots = input.slots.filter((s) => !meals.some((m) => m.slot === s));
  if (missingSlots.length > 0) fixes.push(`missing ${missingSlots.join(", ")}`);
  return { meals, fixes, missingSlots };
};
