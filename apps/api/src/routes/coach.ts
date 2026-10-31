import {
  CoachAdviseBodySchema,
  type CoachAdviseResponse,
  CoachReviseBodySchema,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { CoachAccountability } from "../ports/coach-advisor";
import { getCoachAdvisor } from "../lib/coach-advisor";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { todayUtc } from "../lib/dates";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { isHarshPick } from "../services/accountability-copy";
import { buildCoachContext, toCoachAccountability } from "../services/coach-context";
import { deriveCoachPills } from "../services/coach-pills";
import { withAiCredits } from "../services/credits-gate";
import { buildPersonalDayContext } from "../services/personal-context";
import { revisePlans } from "../services/plan-revise";
import { loadTrainerPersona } from "../services/trainer-persona";

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
  const includePersonal = body.includePersonal !== false;
  const localDate = body.localDate ?? todayUtc();

  let context = body.context ?? localDate;
  let personalWin: string | null = null;
  let accountability: CoachAccountability | undefined;
  if (includePersonal) {
    const personal = await buildPersonalDayContext(db, userId, localDate);
    accountability = toCoachAccountability(personal);
    // A soft win must never undo a call-out (over kcal, missed lift, short protein).
    personalWin = isHarshPick(personal.scenario, personal.secondaryScenarios)
      ? null
      : personal.win;
    context = buildCoachContext(personal, { note: body.note, context: body.context });
  }

  const persona = await loadTrainerPersona(db, userId);
  // `x-mirra-ai-mode: heuristic` lets the app keep working after a 402 (no LLM, no credits).
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
        context,
        accountability,
        persona,
      }),
  );

  const message = sanitizeAiCopy(
    personalWin && !result.message.toLowerCase().includes("win")
      ? `${result.message} ${personalWin}`
      : result.message,
  );

  const pills = deriveCoachPills({
    scenario: accountability?.scenario,
    secondary: accountability?.secondary,
    readiness: body.readiness,
    status: body.status,
  });

  const response: CoachAdviseResponse = {
    message,
    vectors: result.vectors?.map((v) => ({
      ...v,
      title: sanitizeAiCopy(v.title),
      detail: sanitizeAiCopy(v.detail),
    })),
    rebuildSuggested: result.rebuildSuggested,
    coachMessage: message,
    source: result.source,
    scenario: accountability?.scenario,
    ...(pills.length > 0 ? { pills } : {}),
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
