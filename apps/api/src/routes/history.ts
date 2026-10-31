import { HistoryDayQuerySchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadDayHistory } from "../services/day-history";

export const historyRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

historyRoutes.get("/v1/history/day", requireAuth, async (c) => {
  const query = parseBody(HistoryDayQuerySchema, { date: c.req.query("date") });
  const db = createDb(c.env.DB);
  return c.json(await loadDayHistory(db, c.get("userId"), query.date));
});
