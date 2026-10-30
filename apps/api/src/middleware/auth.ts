import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { createDb } from "../db";
import { users } from "../db/schema";
import type { MirraEnv } from "../env";
import { unauthorized } from "../lib/errors";
import type { RequestIdVars } from "./request-id";

export type AuthVars = RequestIdVars & {
  userId: string;
};

const isDevUserHeaderAllowed = (env: MirraEnv): boolean =>
  env.ALLOW_DEV_USER_HEADER === "true";

/**
 * Require authenticated user.
 *
 * DEV ONLY: when `ALLOW_DEV_USER_HEADER=true`, accept `x-mirra-user-id`
 * (alias `x-user-id`) and upsert an ephemeral users row. Do not use in prod.
 */
export const requireAuth = createMiddleware<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>(async (c, next) => {
  // Better Auth session wiring lands later — session path always unset for now.
  const sessionUserId: string | null = null;

  if (sessionUserId) {
    c.set("userId", sessionUserId);
    await next();
    return;
  }

  if (!isDevUserHeaderAllowed(c.env)) {
    throw unauthorized();
  }

  // DEV ONLY bypass — documented in env.ts / wrangler vars.
  const header =
    c.req.header("x-mirra-user-id")?.trim() || c.req.header("x-user-id")?.trim();
  if (!header) {
    throw unauthorized("Missing session or x-mirra-user-id (DEV ONLY)");
  }

  const db = createDb(c.env.DB);
  const [existing] = await db.select().from(users).where(eq(users.id, header)).limit(1);
  if (!existing) {
    const now = new Date();
    await db.insert(users).values({
      id: header,
      email: null,
      name: `dev:${header}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  c.set("userId", header);
  await next();
});
