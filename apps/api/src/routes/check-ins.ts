import {
  CheckInBodySchema,
  type CheckInListResponse,
  type CheckInResponse,
  type CheckInStatus,
} from "@mirra/contracts";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { checkIns } from "../db/schema";
import type { MirraEnv } from "../env";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { getCoachAdvisor, hasOpenAi } from "../lib/coach-advisor";
import { msToUnix } from "../lib/dates";
import { newId } from "../lib/id";
import { decodeCursor, olderThan, parsePageQuery, toPage } from "../lib/pagination";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

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

  let coachMessage: string | undefined;
  if (hasOpenAi(c.env)) {
    try {
      const advise = await getCoachAdvisor(c.env, db).advise({
        userId,
        status: body.status,
        note: body.note ?? undefined,
      });
      coachMessage = sanitizeAiCopy(advise.message);
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

/** Newest-first check-in history. `?limit=` (default 20, max 50) + opaque `?cursor=`. */
checkInRoutes.get("/v1/check-ins", requireAuth, async (c) => {
  const { limit, cursor } = parsePageQuery(c.req.query());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        cursor ? olderThan(checkIns.createdAt, checkIns.id, decodeCursor(cursor)) : undefined,
      ),
    )
    .orderBy(desc(checkIns.createdAt), desc(checkIns.id))
    .limit(limit + 1);

  const page = toPage(rows, limit, (r) => msToUnix(r.createdAt) ?? 0);
  const body: CheckInListResponse = {
    items: page.items.map((r) => ({
      id: r.id,
      localDate: r.localDate,
      status: r.status as CheckInStatus,
      note: r.note,
      triggeredRebuild: r.triggeredRebuild,
      createdAt: msToUnix(r.createdAt) ?? 0,
    })),
    nextCursor: page.nextCursor,
  };
  return c.json(body);
});
