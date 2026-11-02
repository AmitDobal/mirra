import {
  NotificationPrefsPatchSchema,
  NotificationsQuerySchema,
} from "@mirra/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { notFound } from "../lib/errors";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import {
  createNotification,
  getPrefs,
  listNotifications,
  markAllRead,
  markRead,
  patchPrefs,
} from "../services/notifications";

export const notificationRoutes = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

notificationRoutes.get("/v1/notifications", requireAuth, async (c) => {
  const query = parseBody(NotificationsQuerySchema, {
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit") || undefined,
  });
  return c.json(await listNotifications(createDb(c.env.DB), c.get("userId"), query));
});

// Registered before `/:id/read` so `read-all` is never captured as an id.
notificationRoutes.post("/v1/notifications/read-all", requireAuth, async (c) => {
  const updated = await markAllRead(createDb(c.env.DB), c.get("userId"));
  return c.json({ updated });
});

notificationRoutes.post("/v1/notifications/:id/read", requireAuth, async (c) => {
  await markRead(createDb(c.env.DB), c.get("userId"), c.req.param("id"));
  return c.json({ ok: true });
});

notificationRoutes.get("/v1/notification-prefs", requireAuth, async (c) =>
  c.json(await getPrefs(createDb(c.env.DB), c.get("userId"))),
);

notificationRoutes.patch("/v1/notification-prefs", requireAuth, async (c) => {
  const patch = parseBody(NotificationPrefsPatchSchema, await c.req.json().catch(() => ({})));
  return c.json(await patchPrefs(createDb(c.env.DB), c.get("userId"), patch));
});

const DevSeedBody = z.object({
  kind: z.enum(["streak_at_risk", "badge_unlock", "coach", "workout", "nutrition", "system"]),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  payload: z.object({ route: z.string(), label: z.string() }).optional(),
});

/** DEV ONLY (404 unless `ALLOW_DEV_USER_HEADER=true`): seed an inbox row for smoke. */
notificationRoutes.post("/v1/notifications/dev/seed", requireAuth, async (c) => {
  if (c.env.ALLOW_DEV_USER_HEADER !== "true") throw notFound();
  const body = parseBody(DevSeedBody, await c.req.json().catch(() => ({})));
  return c.json(await createNotification(createDb(c.env.DB), c.get("userId"), body));
});
