import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { getUsageSummary } from "../services/ai-budget";

export const aiRoutes = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

/** Plan chat + other AI meters. Soft-fails to free defaults if ledger/migration missing. */
aiRoutes.get("/v1/ai/usage", requireAuth, async (c) => {
  try {
    return c.json(await getUsageSummary(createDb(c.env.DB), c.get("userId")));
  } catch (err) {
    console.warn("[ai/usage] soft fail", err instanceof Error ? err.message : err);
    return c.json({
      tier: "free",
      monthTokensUsed: 0,
      monthTokensLimit: 80_000,
      features: {
        revise: { used: 0, limit: 8 },
        coach: { used: 0, limit: 15 },
        voice: { used: 0, limit: 3 },
        mealPlan: { used: 0, limit: 5 },
      },
    });
  }
});
