import {
  CreatePlanExerciseBodySchema,
  PatchPlanExerciseBodySchema,
  type PlanExerciseDeleteResponse,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { addExercise, patchExercise, removeExercise } from "../services/workout-edit";

export const workoutEditRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

workoutEditRoutes.post("/v1/workouts/:workoutId/exercises", requireAuth, async (c) => {
  const body = parseBody(CreatePlanExerciseBodySchema, await c.req.json().catch(() => ({})));
  const db = createDb(c.env.DB);
  return c.json(await addExercise(db, c.get("userId"), c.req.param("workoutId"), body), 201);
});

workoutEditRoutes.patch(
  "/v1/workouts/:workoutId/exercises/:exerciseId",
  requireAuth,
  async (c) => {
    const body = parseBody(PatchPlanExerciseBodySchema, await c.req.json().catch(() => ({})));
    const db = createDb(c.env.DB);
    const { workoutId, exerciseId } = c.req.param();
    return c.json(await patchExercise(db, c.get("userId"), workoutId, exerciseId, body));
  },
);

workoutEditRoutes.delete(
  "/v1/workouts/:workoutId/exercises/:exerciseId",
  requireAuth,
  async (c) => {
    const db = createDb(c.env.DB);
    const { workoutId, exerciseId } = c.req.param();
    await removeExercise(db, c.get("userId"), workoutId, exerciseId);
    const response: PlanExerciseDeleteResponse = { ok: true };
    return c.json(response);
  },
);
