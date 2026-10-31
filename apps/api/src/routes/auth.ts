import { Hono } from "hono";

import type { MirraEnv } from "../env";
import { createAuth } from "../lib/auth";
import type { RequestIdVars } from "../middleware/request-id";

/**
 * Better Auth catch-all — `/api/auth/*` (Google OAuth, session, Expo cookie bridge).
 * Create auth per request so D1 stays request-scoped.
 */
export const authRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: RequestIdVars;
}>();

authRoutes.on(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
