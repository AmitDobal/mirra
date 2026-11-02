import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadBadges } from "../services/badges";

export const badgeRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** Kinetic rank definitions plus this user's unlocks. */
badgeRoutes.get("/v1/badges", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await loadBadges(db, c.get("userId")));
});
