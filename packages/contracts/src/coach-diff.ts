import { z } from "zod";

import { MealSlotSchema } from "./fuel";

/**
 * Plan chat diff v2 (AMI-163). Typed proposal rows: every row carries the REAL
 * before/after (dish names + macros, exercise sets x reps), deterministic tags
 * (max 2, S28 pills) and an optional reason line (rendered after "↳ ").
 */

export const MealSnapSchema = z.object({
  name: z.string(),
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const ExerciseSnapSchema = z.object({
  name: z.string(),
  sets: z.number().int(),
  reps: z.string(),
  canonicalId: z.string().nullable(),
});

/** after minus before. */
export const DeltaSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const RevisePrefOpSchema = z.enum([
  "avoid",
  "prefer",
  "diet_tag",
  "cuisine_only",
  "equipment_add",
  "equipment_remove",
]);

const base = {
  id: z.string(),
  tags: z.array(z.string()).max(2),
  reason: z.string().nullable(),
};

const workoutRef = { workoutId: z.string(), dayLabel: z.string() };

export const ReviseItemSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("meal_swap"),
    slot: MealSlotSchema,
    before: MealSnapSchema,
    after: MealSnapSchema,
    delta: DeltaSchema,
  }),
  z.object({ ...base, kind: z.literal("meal_add"), slot: MealSlotSchema, after: MealSnapSchema }),
  z.object({ ...base, kind: z.literal("meal_remove"), slot: MealSlotSchema, before: MealSnapSchema }),
  z.object({
    ...base,
    ...workoutRef,
    kind: z.literal("exercise_swap"),
    before: ExerciseSnapSchema,
    after: ExerciseSnapSchema,
  }),
  z.object({
    ...base,
    ...workoutRef,
    kind: z.literal("exercise_add"),
    after: ExerciseSnapSchema,
    position: z.number().int().min(0),
  }),
  z.object({ ...base, ...workoutRef, kind: z.literal("exercise_remove"), before: ExerciseSnapSchema }),
  z.object({
    ...base,
    kind: z.literal("pref"),
    op: RevisePrefOpSchema,
    /** Row label: "Avoid", "Prefer", "Diet", "Only cuisine", "Add gear", "Remove gear". */
    label: z.string(),
    items: z.array(z.string()),
  }),
  z.object({
    ...base,
    kind: z.literal("session_minutes"),
    before: z.number().int(),
    after: z.number().int(),
    droppedExercises: z.array(z.string()),
  }),
  z.object({ ...base, kind: z.literal("meals_per_day"), before: z.number().int(), after: z.number().int() }),
  z.object({
    ...base,
    kind: z.literal("schedule_day_move"),
    workoutId: z.string(),
    title: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    fromLabel: z.string(),
    toLabel: z.string(),
  }),
]);

/** POST /v1/coach/revise/apply — commit a stored draft (no AI call). */
export const ReviseApplyBodySchema = z.object({
  draftId: z.string().min(1).max(64),
});

export type MealSnap = z.infer<typeof MealSnapSchema>;
export type ExerciseSnap = z.infer<typeof ExerciseSnapSchema>;
export type Delta = z.infer<typeof DeltaSchema>;
export type RevisePrefOp = z.infer<typeof RevisePrefOpSchema>;
export type ReviseItem = z.infer<typeof ReviseItemSchema>;
export type ReviseItemKind = ReviseItem["kind"];
export type ReviseApplyBody = z.infer<typeof ReviseApplyBodySchema>;
