import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { createDb } from "../db";
import { users } from "../db/schema";
import type { MirraEnv } from "../env";
import { createAuth } from "../lib/auth";
import { unauthorized } from "../lib/errors";
import { isDevUserHeaderAllowed } from "../lib/runtime-env";
import type { RequestIdVars } from "./request-id";

export type AuthVars = RequestIdVars & {
  userId: string;
};

const upsertDevUser = async (env: MirraEnv, userId: string): Promise<void> => {
  const db = createDb(env.DB);
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing) return;
  const now = new Date();
  await db.insert(users).values({
    id: userId,
    email: null,
    name: `dev:${userId}`,
    createdAt: now,
    updatedAt: now,
  });
};

/**
 * Require authenticated user.
 *
 * 1. Better Auth session (cookie or `Authorization: Bearer <token>`)
 * 2. DEV / day-test ONLY: when `ALLOW_DEV_USER_HEADER=true` AND not production
 *    (`MIRRA_ENV` / `APP_ENV` / `ENVIRONMENT`), accept `x-mirra-user-id`
 *    (alias `x-user-id`) and upsert an ephemeral users row.
 */
export const requireAuth = createMiddleware<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>(async (c, next) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user?.id) {
      c.set("userId", session.user.id);
      await next();
      return;
    }
  } catch {
    // Fall through to dev header when session lookup fails / is unset.
  }

  if (!isDevUserHeaderAllowed(c.env)) {
    throw unauthorized();
  }

  const header =
    c.req.header("x-mirra-user-id")?.trim() || c.req.header("x-user-id")?.trim();
  if (!header) {
    throw unauthorized("Missing session or x-mirra-user-id (DEV ONLY)");
  }

  await upsertDevUser(c.env, header);
  c.set("userId", header);
  await next();
});
