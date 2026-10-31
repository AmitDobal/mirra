import {
  CoachAdviseBodySchema,
  CoachReviseBodySchema,
  type CoachAdviseResponse,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { getCoachAdvisor } from "../lib/coach-advisor";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { withAiCredits } from "../services/credits-gate";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { revisePlans } from "../services/plan-revise";

export const coachRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const readinessToScore = (
  readiness: number | "push" | "rest" | undefined,
): number | undefined => {
  if (typeof readiness === "number") return readiness;
  if (readiness === "push") return 8;
  if (readiness === "rest") return 3;
  return undefined;
};

const statusFromBody = (
  status: string | undefined,
  readiness: number | "push" | "rest" | undefined,
): string => {
  if (status) return status;
  if (readiness === "rest") return "skipped";
  if (readiness === "push") return "partial";
  return "partial";
};

coachRoutes.post("/v1/coach/advise", requireAuth, async (c) => {
  const body = parseBody(CoachAdviseBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const forceHeuristic = c.req.header("x-mirra-ai-mode")?.toLowerCase() === "heuristic";
  const advisor = getCoachAdvisor(c.env, db, { forceHeuristic });
  const result = await withAiCredits(
    { env: c.env, db, userId },
    {
      feature: "coach",
      paid: !forceHeuristic && resolveAiProvider(c.env) === "openai",
      wasPaid: (r) => r.source === "openai",
    },
    () =>
      advisor.advise({
        userId,
        readiness: readinessToScore(body.readiness),
        status: statusFromBody(body.status, body.readiness),
        note: body.note,
        vectorId: body.vectorId,
        context: body.context ?? body.localDate,
      }),
  );
  const response: CoachAdviseResponse = {
    message: result.message,
    vectors: result.vectors,
    rebuildSuggested: result.rebuildSuggested,
    coachMessage: result.message,
  };
  return c.json(response);
});

/** Plan chat: revise the existing meal/workout plans from a chat message. */
coachRoutes.post("/v1/coach/revise", requireAuth, async (c) => {
  const body = parseBody(CoachReviseBodySchema, await c.req.json().catch(() => ({})));
  const response = await revisePlans(
    { env: c.env, db: createDb(c.env.DB), userId: c.get("userId") },
    body,
  );
  return c.json(response);
});
