import type { PersonalInsights } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { buildPersonalDayContext } from "../services/personal-context";

export const insightsRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

insightsRoutes.get("/v1/insights/today", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  // No date: the service falls back to the user's profile-timezone today (AMI-183).
  const ctx = await buildPersonalDayContext(db, c.get("userId"), c.req.query("date") || undefined);
  const { facts: _facts, goal: _goal, ...insights } = ctx;
  const body: PersonalInsights = insights;
  return c.json(body);
});
