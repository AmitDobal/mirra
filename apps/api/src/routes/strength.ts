import { MuscleIdSchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { notFound } from "../lib/errors";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadExerciseStrength, loadMuscleStrength, loadStrengthOverview } from "../services/strength-read";

/** Strength tiers (AMI-165, arch §6.5). Free for every user. */
export const strengthRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

strengthRoutes.get("/v1/strength", requireAuth, async (c) =>
  c.json(await loadStrengthOverview(createDb(c.env.DB), c.get("userId"))),
);

strengthRoutes.get("/v1/strength/muscles/:muscleId", requireAuth, async (c) => {
  const parsed = MuscleIdSchema.safeParse(c.req.param("muscleId"));
  if (!parsed.success) throw notFound("Unknown muscle");
  return c.json(await loadMuscleStrength(createDb(c.env.DB), c.get("userId"), parsed.data));
});

strengthRoutes.get("/v1/strength/exercises/:exerciseId", requireAuth, async (c) =>
  c.json(await loadExerciseStrength(createDb(c.env.DB), c.get("userId"), c.req.param("exerciseId").trim())),
);
