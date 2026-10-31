import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import { users } from "../db/schema";
import type { MirraEnv } from "../env";
import { createAuth } from "../lib/auth";
import { badRequest, unauthorized } from "../lib/errors";
import type { RequestIdVars } from "../middleware/request-id";

const BodySchema = z.object({
  userId: z.string().min(1).max(128).optional(),
});

/**
 * DEV ONLY — mint a Better Auth session token without Google.
 * Gated by ALLOW_DEV_USER_HEADER=true. Used to prove Bearer session auth
 * end-to-end before Google OAuth credentials are configured.
 * Never enable this gate in production.
 */
export const devAuthRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: RequestIdVars;
}>();

devAuthRoutes.post("/v1/dev/session", async (c) => {
  if (c.env.ALLOW_DEV_USER_HEADER !== "true") {
    throw unauthorized("Dev session minting disabled");
  }

  const raw = await c.req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.message);

  const userId =
    parsed.data.userId?.trim() ||
    c.req.header("x-mirra-user-id")?.trim() ||
    "day-test-1";

  const db = createDb(c.env.DB);
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) {
    const now = new Date();
    await db.insert(users).values({
      id: userId,
      email: `${userId}@dev.mirra.local`,
      name: `dev:${userId}`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const auth = createAuth(c.env);
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(userId, false);
  if (!session?.token) {
    throw badRequest("Could not create session");
  }

  return c.json(
    {
      userId,
      token: session.token,
      expiresAt:
        session.expiresAt instanceof Date
          ? session.expiresAt.getTime()
          : Number(session.expiresAt),
    },
    201,
  );
});
