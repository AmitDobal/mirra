import {
  PlanGenerateBodySchema,
  type PlanJobResponse,
  type PlanJobStatus,
  PlanRebuildApplyBodySchema,
  PlanRebuildPreviewBodySchema,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { planJobs } from "../db/schema";
import type { MirraEnv } from "../env";
import { requirePro } from "../lib/entitlement";
import { notFound } from "../lib/errors";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadCurrentPlan } from "../services/plan-loaders";
import { applyRebuild, previewRebuild } from "../services/rebuild-plan";
import { runPlanGenerateJob } from "../services/run-plan-job";

export const planRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

planRoutes.post("/v1/plans/generate", requireAuth, async (c) => {
  const raw = await c.req.json().catch(() => ({}));
  const body = parseBody(PlanGenerateBodySchema, raw ?? {});
  const db = createDb(c.env.DB);
  const { jobId } = await runPlanGenerateJob({
    db,
    env: c.env,
    userId: c.get("userId"),
    weekStart: body.weekStart,
  });
  return c.json({ jobId }, 201);
});

planRoutes.get("/v1/plans/jobs/:id", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  const jobId = c.req.param("id");
  const [job] = await db
    .select()
    .from(planJobs)
    .where(and(eq(planJobs.id, jobId), eq(planJobs.userId, c.get("userId"))))
    .limit(1);
  if (!job) throw notFound("Plan job not found");

  const body: PlanJobResponse = {
    status: job.status as PlanJobStatus,
    planId: job.planId,
    error: job.error,
  };
  return c.json(body);
});

planRoutes.get("/v1/plans/current", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await loadCurrentPlan(db, c.get("userId")));
});

planRoutes.post("/v1/plans/rebuild/preview", requireAuth, async (c) => {
  const body = parseBody(PlanRebuildPreviewBodySchema, await c.req.json());
  const db = createDb(c.env.DB);
  return c.json(
    await previewRebuild(db, c.env, c.get("userId"), body.reason, body.checkInId),
  );
});

planRoutes.post("/v1/plans/rebuild/apply", requireAuth, async (c) => {
  const body = parseBody(PlanRebuildApplyBodySchema, await c.req.json());
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  await requirePro(db, userId);
  const plan = await applyRebuild(db, userId, body.previewToken);
  return c.json(plan);
});
