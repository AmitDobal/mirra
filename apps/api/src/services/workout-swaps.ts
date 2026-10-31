/** Equipment-aware exercise substitution tables for plan chat. */

export type GearNeed = "cables" | "machines" | "barbell";
export type SwapOption = "bands" | "dumbbells" | "bodyweight";
type Swap = { pattern: RegExp; to: Record<SwapOption, string> };

/** Order tried per unavailable gear (first option the user actually has wins). */
export const SWAP_ORDER: Record<GearNeed, SwapOption[]> = {
  cables: ["bands", "dumbbells", "bodyweight"],
  machines: ["dumbbells", "bodyweight"],
  barbell: ["dumbbells", "bodyweight"],
};

export const SWAP_MAP: Record<GearNeed, Swap[]> = {
  cables: [
    { pattern: /face pull/i, to: { bands: "Band face pull", dumbbells: "Rear-delt dumbbell fly", bodyweight: "Prone Y raise" } },
    { pattern: /pulldown|pull-up|pullup/i, to: { bands: "Band-assisted pull-up", dumbbells: "Single-arm dumbbell row", bodyweight: "Inverted row" } },
    { pattern: /tricep|pushdown/i, to: { bands: "Band pushdown", dumbbells: "Dumbbell overhead triceps extension", bodyweight: "Bench dip" } },
    { pattern: /curl|bicep/i, to: { bands: "Band curl", dumbbells: "Dumbbell curl", bodyweight: "Chin-up hold" } },
    { pattern: /fly|crossover/i, to: { bands: "Band chest fly", dumbbells: "Dumbbell fly", bodyweight: "Push-up" } },
    { pattern: /./, to: { bands: "Band row", dumbbells: "Dumbbell row", bodyweight: "Inverted row" } },
  ],
  machines: [
    { pattern: /chest press|pec|fly/i, to: { bands: "Band chest fly", dumbbells: "Dumbbell bench press", bodyweight: "Push-up" } },
    { pattern: /shoulder press/i, to: { bands: "Band overhead press", dumbbells: "Dumbbell shoulder press", bodyweight: "Pike push-up" } },
    { pattern: /leg press|hack squat/i, to: { bands: "Banded squat", dumbbells: "Goblet squat", bodyweight: "Split squat" } },
    { pattern: /leg curl|hamstring/i, to: { bands: "Banded leg curl", dumbbells: "Dumbbell Romanian deadlift", bodyweight: "Glute bridge" } },
    { pattern: /leg extension/i, to: { bands: "Banded leg extension", dumbbells: "Dumbbell step-up", bodyweight: "Wall sit" } },
    { pattern: /row|pulldown|lat/i, to: { bands: "Band row", dumbbells: "Single-arm dumbbell row", bodyweight: "Inverted row" } },
    { pattern: /./, to: { bands: "Banded squat", dumbbells: "Goblet squat", bodyweight: "Bodyweight squat" } },
  ],
  barbell: [
    { pattern: /bench/i, to: { bands: "Band chest press", dumbbells: "Dumbbell bench press", bodyweight: "Push-up" } },
    { pattern: /squat/i, to: { bands: "Banded squat", dumbbells: "Goblet squat", bodyweight: "Bodyweight squat" } },
    { pattern: /deadlift|romanian/i, to: { bands: "Banded good morning", dumbbells: "Dumbbell Romanian deadlift", bodyweight: "Glute bridge" } },
    { pattern: /row/i, to: { bands: "Band row", dumbbells: "Dumbbell row", bodyweight: "Inverted row" } },
    { pattern: /press|overhead/i, to: { bands: "Band overhead press", dumbbells: "Dumbbell shoulder press", bodyweight: "Pike push-up" } },
    { pattern: /./, to: { bands: "Band row", dumbbells: "Dumbbell lunge", bodyweight: "Bodyweight lunge" } },
  ],
};

const HAS_ALTERNATIVE = /dumbbell|band|bodyweight|kettlebell/i;
const CABLE_RE = /cable|pulldown|face pull|pushdown|crossover/i;
const MACHINE_RE = /machine|leg press|pec deck|hack squat|leg extension|leg curl|smith|seated row|chest press|assisted/i;
const BARBELL_RE = /barbell|\bez.?bar\b|\b(back|front) squat\b|^bench press|^deadlift|^bent.?over row/i;

/** Which unavailable gear an exercise needs, by name. */
export const gearNeeded = (name: string): GearNeed | null => {
  if (/\bcable/i.test(name)) return "cables";
  if (HAS_ALTERNATIVE.test(name)) return null; // "Band face pull" is not a cable move
  if (CABLE_RE.test(name)) return "cables";
  if (MACHINE_RE.test(name)) return "machines";
  if (BARBELL_RE.test(name)) return "barbell";
  return null;
};

/** Replacement name for `name`, or null when no allowed option exists. */
export const pickSwap = (
  name: string,
  need: GearNeed,
  has: (gear: string) => boolean,
): string | null => {
  const rule = SWAP_MAP[need].find((s) => s.pattern.test(name));
  if (!rule) return null;
  const option = SWAP_ORDER[need].find((o) => o === "bodyweight" || has(o));
  return option ? rule.to[option] : null;
};
