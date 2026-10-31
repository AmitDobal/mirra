import type { PlanReviseIntent } from "../ports/plan-reviser";

/** What "full_gym" means once the user rules a piece of it out. */
const FULL_GYM_EXPANDED = ["dumbbells", "barbell", "machines", "cables", "bands", "bodyweight", "bench"];
const SESSION_STEPS = [20, 30, 45, 60] as const;

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Available-equipment list after the intent. `full_gym` expands only when something is removed. */
export const reviseEquipment = (
  current: string[],
  intent: Pick<PlanReviseIntent, "equipmentAdd" | "equipmentRemove">,
): string[] => {
  let list = current;
  if (intent.equipmentRemove.length > 0 && list.includes("full_gym")) {
    list = uniq([...list.filter((e) => e !== "full_gym"), ...FULL_GYM_EXPANDED]);
  }
  list = list.filter((e) => !intent.equipmentRemove.includes(e));
  return uniq([...list, ...intent.equipmentAdd]);
};

/** Comma list for `foods_avoid`; keeps existing words, appends new ones. */
export const reviseFoodsAvoid = (current: string | null, add: string[]): string | null => {
  const have = (current ?? "")
    .split(/[,;\n]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const lower = new Set(have.map((w) => w.toLowerCase()));
  const merged = [...have, ...add.filter((w) => !lower.has(w.toLowerCase()))];
  return merged.length > 0 ? merged.join(", ") : null;
};

export const reviseDietTags = (current: string[], add: string[]): string[] =>
  add.length === 0 ? current : uniq([...current.filter((t) => t !== "no_preference"), ...add]);

/** Largest allowed session length ≤ minutes (min 20). */
export const snapSessionMinutes = (minutes: number): number =>
  [...SESSION_STEPS].reverse().find((s) => s <= minutes) ?? SESSION_STEPS[0];

export const sameList = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** Cuisine list after the intent: "only X" replaces, otherwise merge. "other" is dropped once a real cuisine is chosen. */
export const reviseCuisines = (
  current: string[],
  add: string[],
  only: boolean | undefined,
): string[] => {
  if (add.length === 0) return current;
  if (only) return uniq(add);
  return uniq([...current.filter((c) => c !== "other"), ...add]);
};
