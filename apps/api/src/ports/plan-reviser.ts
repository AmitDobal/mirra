import type { TrainerPersona } from "@mirra/contracts";

/** Plan chat: turns a free-text message into a structured edit of the EXISTING plans. */

export type PlanReviseScope = "auto" | "meal" | "workout" | "both";

/** Equipment ids match onboarding (`full_gym`, `dumbbells`, …) plus `bench`. */
export type PlanReviseIntent = {
  equipmentAdd: string[];
  equipmentRemove: string[];
  foodsAvoidAdd: string[];
  dietTagsAdd: string[];
  /** Cuisine ids to add ("prefer Indian food") or, with cuisineStylesOnly, to switch to. */
  cuisineStylesAdd: string[];
  /** "only Chinese": replace the user's cuisines instead of merging. */
  cuisineStylesOnly?: boolean;
  forceMealRegen: boolean;
  reviseWorkout: boolean;
  /** Push day: prefer a bench press variant. */
  preferBench?: boolean;
  /** Cap session length in minutes (trims tail exercises). */
  shortenMin?: number;
  /** Target meals per day (1-4); "I only eat two times a day" -> 2. */
  mealsPerDay?: number;
};

/** One planned meal as the reviser sees it (for "swap lunch", "two meals a day"). */
export type PlanReviseMeal = { slot: string; title: string; kcal: number; status: string };

/** Targets + personal context so replies/intent fit the user's actual nutrition. */
export type PlanReviseNutrition = {
  goal: string | null;
  kcalTarget: number | null;
  proteinGTarget: number | null;
  lifestyleNotes: string | null;
};

export type PlanReviseInput = {
  userId: string;
  message: string;
  scope: PlanReviseScope;
  equipment: string[];
  dietTags: string[];
  foodsAvoid: string | null;
  cuisineStyles: string[];
  workoutTitle: string | null;
  exerciseNames: string[];
  /** Saved meals-per-day preference; null = default four slots. */
  mealsPerDay: number | null;
  /** Today's current meals (empty when no plan yet). */
  meals: PlanReviseMeal[];
  nutrition: PlanReviseNutrition;
  /** Trainer character voice for the reply; defaults to drill. */
  persona?: TrainerPersona;
};

export type PlanReviseResult = {
  intent: PlanReviseIntent;
  reply: string;
  warnings: string[];
  /** Which adapter produced this result. */
  source?: "openai" | "heuristic";
};

export type PlanReviser = {
  propose: (input: PlanReviseInput) => Promise<PlanReviseResult>;
};
