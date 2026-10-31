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
