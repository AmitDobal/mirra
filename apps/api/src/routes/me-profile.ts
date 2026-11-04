import { UpdateProfileBodySchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { applyProfileEditSafe } from "../services/goal-refresh";
import { updateProfile } from "../services/profile-update";

export const meProfileRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/**
 * Edit onboarding answers from You (AMI-176). Partial merge, session user only.
 * Never regenerates the plan: the client offers `/rebuild` for plan-affecting fields.
 */
meProfileRoutes.patch("/v1/me/profile", requireAuth, async (c) => {
  const raw: unknown = await c.req.json().catch(() => null);
  const body = parseBody(UpdateProfileBodySchema, raw);
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const out = await updateProfile(db, userId, body);
  // AMI-179: new goal version only for goal inputs; else snapshot refresh. Never fails the PATCH.
  await applyProfileEditSafe(db, userId, body);
  return c.json(out);
});
