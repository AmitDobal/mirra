import type { GoalImpact } from "@mirra/contracts";

import { apiFetch } from "./client";
import type { DayMealPlan } from "./meal-plan";

export type { GoalImpact };

export type CoachReviseScope = "auto" | "meal" | "workout" | "both";

/** Mirrors contracts `CoachReviseIntentSchema`: the structured edit a preview resolved. */
export type CoachReviseIntent = {
  readonly equipmentAdd: readonly string[];
  readonly equipmentRemove: readonly string[];
  readonly foodsAvoidAdd: readonly string[];
  readonly dietTagsAdd: readonly string[];
  readonly cuisineStylesAdd: readonly string[];
  readonly cuisineStylesOnly?: boolean;
  readonly forceMealRegen: boolean;
  readonly reviseWorkout: boolean;
  readonly preferBench?: boolean;
  readonly shortenMin?: number;
  readonly mealsPerDay?: number;
};

/** Mirrors contracts `coach.ts` (`POST /v1/coach/revise`). */
export type CoachReviseBody = {
  readonly message: string;
  readonly scope?: CoachReviseScope;
  readonly date?: string;
  readonly dryRun?: boolean;
  /** Confirm: apply exactly the previewed intent (server skips re-parsing `message`). */
  readonly intent?: CoachReviseIntent;
  readonly context?: {
    readonly workoutId?: string;
    readonly mealItemId?: string;
    readonly exerciseId?: string;
  };
};

export type MealSlotName = "breakfast" | "lunch" | "snack" | "dinner";

/** Mirrors contracts `coach-diff.ts` (AMI-163). */
export type MealSnap = {
  readonly name: string;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
};

export type ExerciseSnap = {
  readonly name: string;
  readonly sets: number;
  readonly reps: string;
  readonly canonicalId: string | null;
};

/** after minus before. */
export type MacroDelta = Omit<MealSnap, "name">;

export type RevisePrefOp =
  | "avoid"
  | "prefer"
  | "diet_tag"
  | "cuisine_only"
  | "equipment_add"
  | "equipment_remove";

type ItemBase = { readonly id: string; readonly tags: readonly string[]; readonly reason: string | null };
type WorkoutRef = { readonly workoutId: string; readonly dayLabel: string };

export type ReviseItem =
  | (ItemBase & {
      readonly kind: "meal_swap";
      readonly slot: MealSlotName;
      readonly before: MealSnap;
      readonly after: MealSnap;
      readonly delta: MacroDelta;
    })
  | (ItemBase & { readonly kind: "meal_add"; readonly slot: MealSlotName; readonly after: MealSnap })
  | (ItemBase & { readonly kind: "meal_remove"; readonly slot: MealSlotName; readonly before: MealSnap })
  | (ItemBase & WorkoutRef & { readonly kind: "exercise_swap"; readonly before: ExerciseSnap; readonly after: ExerciseSnap })
  | (ItemBase & WorkoutRef & { readonly kind: "exercise_add"; readonly after: ExerciseSnap; readonly position: number })
  | (ItemBase & WorkoutRef & { readonly kind: "exercise_remove"; readonly before: ExerciseSnap })
  | (ItemBase & { readonly kind: "pref"; readonly op: RevisePrefOp; readonly label: string; readonly items: readonly string[] })
  | (ItemBase & {
      readonly kind: "session_minutes";
      readonly before: number;
      readonly after: number;
      readonly droppedExercises: readonly string[];
    })
  | (ItemBase & { readonly kind: "meals_per_day"; readonly before: number; readonly after: number })
  | (ItemBase & {
      readonly kind: "schedule_day_move";
      readonly workoutId: string;
      readonly title: string;
      readonly fromDate: string;
      readonly toDate: string;
      readonly fromLabel: string;
      readonly toLabel: string;
    });

export type ReviseItemKind = ReviseItem["kind"];

export type CoachReviseArea = "workout" | "meal" | "prefs";

export type CoachReviseChange = {
  readonly kind: string;
  readonly summary: string;
  readonly area?: CoachReviseArea;
  readonly before?: string;
  readonly after?: string;
};

export type CoachReviseResponse = {
  readonly message: string;
  readonly changes: readonly CoachReviseChange[];
  readonly applied: boolean;
  readonly source: "openai" | "heuristic";
  readonly mealPlan?: DayMealPlan | null;
  readonly workoutTitle?: string | null;
  readonly warnings?: readonly string[];
  /** Resolved intent; echo it back with dryRun:false to apply this exact preview. */
  readonly intent?: CoachReviseIntent;
  /** v2: stored draft to commit via `postCoachReviseApply` (null when nothing to apply). */
  readonly draftId?: string | null;
  /** v2: epoch ms after which the draft can no longer be applied. */
  readonly expiresAt?: number | null;
  /** v2 typed diff rows (contracts `coach-diff.ts`). Absent on older APIs: use `changes`. */
  readonly items?: readonly ReviseItem[];
  /** AMI-181: deterministic goal-estimate line for the proposal (null when no goal). */
  readonly goalImpact?: GoalImpact | null;
};

/** POST /v1/coach/revise — chat message that edits the existing meal + workout plans. */
export const postCoachRevise = (body: CoachReviseBody) =>
  apiFetch<CoachReviseResponse>("/v1/coach/revise", { method: "POST", body });

/**
 * POST /v1/coach/revise/apply — commit the previewed draft exactly as shown (no AI call).
 * Throws MirraApiError 409 `plan_changed` (plan drifted) or 410 `draft_gone` (applied/expired).
 */
export const postCoachReviseApply = (draftId: string) =>
  apiFetch<CoachReviseResponse>("/v1/coach/revise/apply", { method: "POST", body: { draftId } });
