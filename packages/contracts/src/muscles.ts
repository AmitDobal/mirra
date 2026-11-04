import { z } from "zod";

/** 18 muscle ids used by anatomy maps, focus maps and strength tiers (arch §2). */
export const MUSCLE_IDS = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "traps",
  "lats",
  "upper_back",
  "lower_back",
  "abs",
  "obliques",
  "quads",
  "adductors",
  "hamstrings",
  "glutes",
  "calves",
] as const;

export const MuscleIdSchema = z.enum(MUSCLE_IDS);

export const MUSCLE_GROUP_IDS = ["chest", "shoulders", "arms", "back", "core", "legs"] as const;

export const MuscleGroupIdSchema = z.enum(MUSCLE_GROUP_IDS);

export type MuscleId = z.infer<typeof MuscleIdSchema>;
export type MuscleGroupId = z.infer<typeof MuscleGroupIdSchema>;

export const MUSCLE_GROUP_OF: Readonly<Record<MuscleId, MuscleGroupId>> = {
  chest: "chest",
  front_delts: "shoulders",
  side_delts: "shoulders",
  rear_delts: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  traps: "back",
  lats: "back",
  upper_back: "back",
  lower_back: "back",
  abs: "core",
  obliques: "core",
  quads: "legs",
  adductors: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
};

export const MuscleRoleSchema = z.enum(["primary", "secondary"]);
export type MuscleRole = z.infer<typeof MuscleRoleSchema>;

/** Involvement pct at or above this is a primary mover. */
export const PRIMARY_MUSCLE_PCT = 30;

export const muscleRoleOf = (pct: number): MuscleRole =>
  pct >= PRIMARY_MUSCLE_PCT ? "primary" : "secondary";

export const ExerciseMuscleSchema = z.object({
  id: MuscleIdSchema,
  pct: z.number().min(0).max(100),
  role: MuscleRoleSchema,
});

export type ExerciseMuscle = z.infer<typeof ExerciseMuscleSchema>;
