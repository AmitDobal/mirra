import {
  AttendancePingBodySchema,
  AttendanceWeekQuerySchema,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { addDays } from "../lib/dates";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import {
  loadAttendanceWeek,
  localTodayFor,
  mondayOf,
  recordAttendance,
} from "../services/attendance";

export const attendanceRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/** One ping per app foreground. Returns the last 7 days (today last) for the strip. */
attendanceRoutes.post("/v1/attendance/ping", requireAuth, async (c) => {
  parseBody(AttendancePingBodySchema, await c.req.json().catch(() => ({})));
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const today = await recordAttendance(db, userId, "openedApp");
  return c.json(
    await loadAttendanceWeek(db, userId, addDays(today, -6), today),
  );
});

/** Seven days from `start` (default: Monday of the user's current local week). */
attendanceRoutes.get("/v1/attendance/week", requireAuth, async (c) => {
  const query = parseBody(AttendanceWeekQuerySchema, {
    start: c.req.query("start") || undefined,
  });
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const today = await localTodayFor(db, userId);
  const start = query.start ?? mondayOf(today);
  return c.json(await loadAttendanceWeek(db, userId, start, today));
});
