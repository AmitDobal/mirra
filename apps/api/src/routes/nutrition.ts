import { HistoryQuerySchema, type NutritionSummaryResponse } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { todayUtc } from "../lib/dates";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadNutritionSummary } from "../services/nutrition-summary";

export const nutritionRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** Day / week / month kcal + macro + workout series for the history charts. */
nutritionRoutes.get("/v1/nutrition/summary", requireAuth, async (c) => {
  const q = parseBody(HistoryQuerySchema, c.req.query());
  const body: NutritionSummaryResponse = await loadNutritionSummary(
    createDb(c.env.DB),
    c.get("userId"),
    q.range,
    q.anchor ?? todayUtc(),
  );
  return c.json(body);
});
