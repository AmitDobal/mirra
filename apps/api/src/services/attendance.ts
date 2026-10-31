import type {
  AttendanceDay,
  AttendanceState,
  AttendanceWeekResponse,
} from "@mirra/contracts";
import { and, eq, gte, lte, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { attendanceDay, profiles } from "../db/schema";
import { addDays, localDateIn, mondayOf, msToUnix } from "../lib/dates";

export type AttendanceFlag =
  "openedApp" | "workoutDone" | "mealLogged" | "checkedIn";

type Row = typeof attendanceDay.$inferSelect;

export const loadTimezone = async (
  db: AppDB,
  userId: string,
): Promise<string> => {
  const [row] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row?.timezone ?? "UTC";
};

export const attendanceState = (
  row:
    | Pick<Row, "openedApp" | "workoutDone" | "mealLogged" | "checkedIn">
    | undefined,
): AttendanceState => {
  if (!row) return "none";
  if (row.workoutDone || row.mealLogged || row.checkedIn) return "active";
  return row.openedApp ? "open" : "none";
};

const toDay = (date: string, row: Row | undefined): AttendanceDay => ({
  date,
  state: attendanceState(row),
  openedApp: row?.openedApp ?? false,
  workoutDone: row?.workoutDone ?? false,
  mealLogged: row?.mealLogged ?? false,
  checkedIn: row?.checkedIn ?? false,
  opens: row?.opens ?? 0,
  firstSeenAt: msToUnix(row?.firstSeenAt),
  lastSeenAt: msToUnix(row?.lastSeenAt),
});

/**
 * Idempotent upsert of today's row (local date from the profile timezone) setting one flag.
 * Only `openedApp` bumps `opens`.
 */
export const recordAttendance = async (
  db: AppDB,
  userId: string,
  flag: AttendanceFlag,
  now: Date = new Date(),
): Promise<string> => {
  const localDate = localDateIn(await loadTimezone(db, userId), now);
  const isOpen = flag === "openedApp";
  await db
    .insert(attendanceDay)
    .values({
      userId,
      localDate,
      [flag]: true,
      opens: isOpen ? 1 : 0,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [attendanceDay.userId, attendanceDay.localDate],
      set: {
        [flag]: true,
        lastSeenAt: now,
        ...(isOpen ? { opens: sql`${attendanceDay.opens} + 1` } : {}),
      },
    });
  return localDate;
};

/** Best-effort variant for write paths (session end, meal, check-in): never fails the caller. */
export const recordAttendanceSafe = async (
  db: AppDB,
  userId: string,
  flag: AttendanceFlag,
): Promise<void> => {
  try {
    await recordAttendance(db, userId, flag);
  } catch (err) {
    console.warn("[attendance] write skipped", err);
  }
};

/** Seven days from `start`, oldest first. Days after the user's local today are always `none`. */
export const loadAttendanceWeek = async (
  db: AppDB,
  userId: string,
  start: string,
  today: string,
): Promise<AttendanceWeekResponse> => {
  const end = addDays(start, 6);
  const rows = await db
    .select()
    .from(attendanceDay)
    .where(
      and(
        eq(attendanceDay.userId, userId),
        gte(attendanceDay.localDate, start),
        lte(attendanceDay.localDate, end),
      ),
    );
  const byDate = new Map(rows.map((r) => [r.localDate, r]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return toDay(date, date > today ? undefined : byDate.get(date));
  });
  return { today, start, days };
};

export const localTodayFor = async (
  db: AppDB,
  userId: string,
  now = new Date(),
) => localDateIn(await loadTimezone(db, userId), now);

export { mondayOf };
