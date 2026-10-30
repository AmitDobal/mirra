import { CoachAdviseBodySchema, type CoachAdviseResponse } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { getCoachAdvisor } from "../lib/coach-advisor";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

export const coachRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

coachRoutes.post("/v1/coach/advise", requireAuth, async (c) => {
  const body = parseBody(CoachAdviseBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const advisor = getCoachAdvisor(c.env, db);
  const result = await advisor.advise({
    userId,
    readiness: body.readiness,
    status: body.status,
    note: body.note,
    vectorId: body.vectorId,
    context: body.context,
  });
  const response: CoachAdviseResponse = {
    message: result.message,
    vectors: result.vectors,
    rebuildSuggested: result.rebuildSuggested,
  };
  return c.json(response);
});
