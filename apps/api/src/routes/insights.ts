import type { PersonalInsights } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { todayUtc } from "../lib/dates";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { buildPersonalDayContext } from "../services/personal-context";

export const insightsRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

insightsRoutes.get("/v1/insights/today", requireAuth, async (c) => {
  const date = c.req.query("date") || todayUtc();
  const db = createDb(c.env.DB);
  const ctx = await buildPersonalDayContext(db, c.get("userId"), date);
  const { facts: _facts, ...insights } = ctx;
  const body: PersonalInsights = insights;
  return c.json(body);
});
