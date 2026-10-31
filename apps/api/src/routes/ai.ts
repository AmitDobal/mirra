import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { todayUtc } from "../lib/dates";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { getUsageSummary } from "../services/ai-budget";
import { getTodayVoiceCue } from "../services/voice-cue";

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

aiRoutes.get("/v1/voice/cue/today", requireAuth, async (c) => {
  const date = c.req.query("date")?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] ?? todayUtc();
  try {
    const cue = await getTodayVoiceCue(
      { env: c.env, db: createDb(c.env.DB), userId: c.get("userId") },
      date,
    );
    return c.json(cue);
  } catch (err) {
    // Rate limit stays 429; schema/migrate gaps become a silent text cue.
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429) {
      throw err;
    }
    console.warn("[voice/cue] soft fail", err instanceof Error ? err.message : err);
    return c.json({
      text: "Mirra is ready. Open Fuel or Coach when you want the next move.",
      contentType: "audio/mpeg",
      cached: false,
      remaining: 0,
    });
  }
});
