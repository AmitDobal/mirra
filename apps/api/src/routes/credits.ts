import { ReferralRedeemBodySchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { getCredits } from "../services/credits";
import { getReferralInfo, redeemReferral } from "../services/referral";

export const creditsRoutes = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

creditsRoutes.get("/v1/credits", requireAuth, async (c) =>
  c.json(await getCredits(createDb(c.env.DB), c.env, c.get("userId"))),
);

creditsRoutes.get("/v1/credits/referral", requireAuth, async (c) =>
  c.json(await getReferralInfo(createDb(c.env.DB), c.env, c.get("userId"))),
);

/** STUB: records a pending redemption; awards only when REFERRAL_TOPUP_ENABLED=true. */
creditsRoutes.post("/v1/credits/referral/redeem", requireAuth, async (c) => {
  const body = parseBody(ReferralRedeemBodySchema, await c.req.json().catch(() => ({})));
  return c.json(await redeemReferral(createDb(c.env.DB), c.env, c.get("userId"), body.code));
});
