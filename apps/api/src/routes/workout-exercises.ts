import {
  CreatePlanExerciseBodySchema,
  PatchPlanExerciseBodySchema,
  type PlanExerciseDeleteResponse,
  type PlanExerciseResponse,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { addPlanExercise, deletePlanExercise, patchPlanExercise } from "../services/plan-exercise-edit";

/** User-authored plan edits: S27 swap / add and the Today routine editor (AMI-172). */
export const workoutExerciseRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

workoutExerciseRoutes.post("/v1/workouts/:workoutId/exercises", requireAuth, async (c) => {
  const body = parseBody(CreatePlanExerciseBodySchema, await c.req.json().catch(() => ({})));
  const ctx = { db: createDb(c.env.DB), userId: c.get("userId"), env: c.env };
  const response: PlanExerciseResponse = await addPlanExercise(ctx, c.req.param("workoutId"), body);
  return c.json(response, 201);
});

workoutExerciseRoutes.patch("/v1/workouts/:workoutId/exercises/:exerciseId", requireAuth, async (c) => {
  const body = parseBody(PatchPlanExerciseBodySchema, await c.req.json().catch(() => ({})));
  const ctx = { db: createDb(c.env.DB), userId: c.get("userId"), env: c.env };
  const response: PlanExerciseResponse = await patchPlanExercise(
    ctx,
    c.req.param("workoutId"),
    c.req.param("exerciseId"),
    body,
  );
  return c.json(response);
});

workoutExerciseRoutes.delete("/v1/workouts/:workoutId/exercises/:exerciseId", requireAuth, async (c) => {
  const ctx = { db: createDb(c.env.DB), userId: c.get("userId"), env: c.env };
  const response: PlanExerciseDeleteResponse = await deletePlanExercise(
    ctx,
    c.req.param("workoutId"),
    c.req.param("exerciseId"),
  );
  return c.json(response);
});
