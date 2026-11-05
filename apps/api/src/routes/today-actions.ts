import {
  TodayActionsQuerySchema,
  WaterLogBodySchema,
  type TodayActionsResponse,
  type WaterLogResponse,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import { waterLogs } from "../db/schema";
import type { MirraEnv } from "../env";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadHydration } from "../services/hydration";
import { buildTodayActions } from "../services/today-actions";
import { loadTodayActionsInput } from "../services/today-actions-inputs";
import { dateOrUserToday } from "../services/user-day";

export const todayActionsRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

todayActionsRoutes.get("/v1/today/actions", requireAuth, async (c) => {
  const query = parseBody(TodayActionsQuerySchema, {
    date: c.req.query("date") || undefined,
  });
  const db = createDb(c.env.DB);
  const date = await dateOrUserToday(db, c.get("userId"), query.date);
  const input = await loadTodayActionsInput(db, c.get("userId"), date);
  const body: TodayActionsResponse = buildTodayActions(input);
  return c.json(body);
});

todayActionsRoutes.post("/v1/water", requireAuth, async (c) => {
  const body = parseBody(WaterLogBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const localDate = await dateOrUserToday(db, userId, body.localDate);
  const id = newId();
  const loggedAt = new Date();

  await db.insert(waterLogs).values({ id, userId, localDate, ml: body.ml, loggedAt });

  const response: WaterLogResponse = {
    id,
    ml: body.ml,
    localDate,
    loggedAt: loggedAt.getTime(),
    hydration: await loadHydration(db, userId, localDate),
  };
  return c.json(response, 201);
});
