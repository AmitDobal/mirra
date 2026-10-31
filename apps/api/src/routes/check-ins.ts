import { CheckInBodySchema, type CheckInResponse, type CheckInStatus } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import { checkIns } from "../db/schema";
import type { MirraEnv } from "../env";
import { getCoachAdvisor, hasOpenAi } from "../lib/coach-advisor";
import { msToUnix } from "../lib/dates";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { recordAttendanceSafe } from "../services/attendance";

export const checkInRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

checkInRoutes.post("/v1/check-ins", requireAuth, async (c) => {
  const body = parseBody(CheckInBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const now = new Date();
  const id = newId();
  const triggeredRebuild = body.status === "skipped";

  await db
    .insert(checkIns)
    .values({
      id,
      userId,
      localDate: body.localDate,
      status: body.status,
      note: body.note ?? null,
      triggeredRebuild,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [checkIns.userId, checkIns.localDate],
      set: {
        status: body.status,
        note: body.note ?? null,
        triggeredRebuild,
      },
    });

  await recordAttendanceSafe(db, userId, "checkedIn");

  let coachMessage: string | undefined;
  if (hasOpenAi(c.env)) {
    try {
      const advise = await getCoachAdvisor(c.env, db).advise({
        userId,
        status: body.status,
        note: body.note ?? undefined,
      });
      coachMessage = advise.message;
    } catch {
      // Non-fatal — check-in already persisted.
    }
  }

  const response: CheckInResponse = {
    id,
    localDate: body.localDate,
    status: body.status as CheckInStatus,
    note: body.note ?? null,
    triggeredRebuild,
    createdAt: msToUnix(now) ?? Date.now(),
    ...(coachMessage ? { coachMessage } : {}),
  };
  return c.json(response, 201);
});
