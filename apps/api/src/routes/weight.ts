import {
  WeightBodySchema,
  WeightListQuerySchema,
  type WeightEntry,
  type WeightListResponse,
} from "@mirra/contracts";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { profiles, weightLogs } from "../db/schema";
import type { MirraEnv } from "../env";
import { msToUnix } from "../lib/dates";
import { validationError } from "../lib/errors";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import { type AuthVars, requireAuth } from "../middleware/auth";

export const weightRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** Log a body weight and mirror it onto `profiles.weight_kg` (plans read the profile). */
weightRoutes.post("/v1/weight", requireAuth, async (c) => {
  const body = parseBody(WeightBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const id = newId();
  const loggedAt = new Date(body.loggedAt ?? Date.now());

  await db.insert(weightLogs).values({ id, userId, kg: body.kg, loggedAt });
  await db
    .update(profiles)
    .set({ weightKg: body.kg, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));

  const response: WeightEntry = { id, kg: body.kg, loggedAt: loggedAt.getTime() };
  return c.json(response, 201);
});

/** Newest-first weight history. `?limit=` (default 90, max 365). */
weightRoutes.get("/v1/weight", requireAuth, async (c) => {
  const parsed = WeightListQuerySchema.safeParse({ limit: c.req.query("limit") });
  if (!parsed.success) {
    throw validationError(`limit: ${parsed.error.issues[0]?.message ?? "Invalid"}`);
  }
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt), desc(weightLogs.id))
    .limit(parsed.data.limit);

  const body: WeightListResponse = {
    items: rows.map((r) => ({ id: r.id, kg: r.kg, loggedAt: msToUnix(r.loggedAt) ?? 0 })),
  };
  return c.json(body);
});
