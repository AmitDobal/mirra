import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { readGoal, restartGoal } from "../services/goal-read";

export const goalRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const CACHE = "private, no-cache";

/** Goal timeline (AMI-179). `If-None-Match` → 304 while today's snapshot is current. */
goalRoutes.get("/v1/goal", requireAuth, async (c) => {
  const out = await readGoal(createDb(c.env.DB), c.get("userId"), {
    ifNoneMatch: c.req.header("if-none-match"),
  });
  c.header("Cache-Control", CACHE);
  if (out.kind === "not_modified") {
    c.header("ETag", out.etag);
    return c.body(null, 304);
  }
  if (out.etag) c.header("ETag", out.etag);
  return c.json(out.body);
});

/** New plan version from today's trend weight, same target and pace. Max 1/day (429). */
goalRoutes.post("/v1/goal/restart", requireAuth, async (c) => {
  const out = await restartGoal(createDb(c.env.DB), c.get("userId"));
  c.header("Cache-Control", CACHE);
  c.header("ETag", out.etag);
  return c.json(out.body, 201);
});
