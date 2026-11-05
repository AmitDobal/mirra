import { HistoryQuerySchema, type NutritionSummaryResponse } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadNutritionSummary } from "../services/nutrition-summary";
import { dateOrUserToday } from "../services/user-day";

export const nutritionRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** Day / week / month kcal + macro + workout series for the history charts. */
nutritionRoutes.get("/v1/nutrition/summary", requireAuth, async (c) => {
  const q = parseBody(HistoryQuerySchema, c.req.query());
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const body: NutritionSummaryResponse = await loadNutritionSummary(
    db,
    userId,
    q.range,
    await dateOrUserToday(db, userId, q.anchor),
  );
  return c.json(body);
});
