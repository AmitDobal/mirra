import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadStreaks } from "../services/streaks";

export const streakRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** Current/best streak + fire state per kind, as of the user's local today. */
streakRoutes.get("/v1/streaks", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await loadStreaks(db, c.get("userId")));
});
