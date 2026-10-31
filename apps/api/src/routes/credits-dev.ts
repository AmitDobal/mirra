import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import { entitlements } from "../db/schema";
import type { MirraEnv } from "../env";
import { CREDIT_COSTS } from "../lib/ai-credits";
import type { AiFeature } from "../lib/ai-quotas";
import { notFound } from "../lib/errors";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { recordUsage } from "../services/ai-budget";
import { withAiCredits } from "../services/credits-gate";

/**
 * DEV ONLY (404 unless `ALLOW_DEV_USER_HEADER=true`). Lets `smoke-credits.mjs` drive the real
 * gate deterministically without an LLM key: spend a feature, simulate provider failure or a
 * heuristic fallback, add provider cost, flip the RevenueCat-mapped tier.
 */
export const creditsDevRoutes = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

creditsDevRoutes.use("/v1/credits/dev/*", async (c, next) => {
  if (c.env.ALLOW_DEV_USER_HEADER !== "true") throw notFound();
  await next();
});

const SpendBody = z.object({
  feature: z.enum(Object.keys(CREDIT_COSTS) as [AiFeature, ...AiFeature[]]),
  outcome: z.enum(["paid", "heuristic", "error"]).default("paid"),
  estimatedMicros: z.number().int().min(0).optional(),
});

creditsDevRoutes.post("/v1/credits/dev/spend", requireAuth, async (c) => {
  const body = parseBody(SpendBody, await c.req.json().catch(() => ({})));
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const result = await withAiCredits(
    { env: c.env, db, userId },
    { feature: body.feature, paid: true, wasPaid: (r: { paid: boolean }) => r.paid },
    async () => {
      if (body.outcome === "error") throw new Error("simulated provider failure");
      if (body.outcome === "paid") {
        await recordUsage(db, {
          userId,
          feature: body.feature,
          provider: "dev",
          estimatedMicros: body.estimatedMicros ?? 0,
        });
      }
      return { paid: body.outcome === "paid" };
    },
  );
  return c.json(result);
});

creditsDevRoutes.post("/v1/credits/dev/entitlement", requireAuth, async (c) => {
  const body = parseBody(z.object({ status: z.enum(["active", "expired"]) }), await c.req.json().catch(() => ({})));
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  await db
    .insert(entitlements)
    .values({ userId, status: body.status, productId: "dev_pro", updatedAt: new Date() })
    .onConflictDoUpdate({ target: entitlements.userId, set: { status: body.status, updatedAt: new Date() } });
  const [row] = await db.select().from(entitlements).where(eq(entitlements.userId, userId)).limit(1);
  return c.json({ status: row?.status });
});
