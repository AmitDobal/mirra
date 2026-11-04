/**
 * The user's calendar day (AMI-183). "Today" and day buckets follow the profile
 * timezone, never the server's UTC clock. A client-sent `date` / `localDate`
 * always wins; these are the fallbacks and the bucketing bounds.
 */
import type { AppDB } from "../db";
import { dayBoundsIn, localDateIn } from "../lib/dates";
import { loadTimezone } from "./attendance";

export { loadTimezone as userTz };

/** Today's `YYYY-MM-DD` in the user's profile timezone. */
export const userToday = async (db: AppDB, userId: string, now: Date = new Date()): Promise<string> =>
  localDateIn(await loadTimezone(db, userId), now);

/** Start/end ms of `date` as lived in the user's profile timezone. */
export const userDayBounds = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<{ start: number; end: number }> => dayBoundsIn(await loadTimezone(db, userId), date);

/** `date` when the client sent one, else the user's local today. */
export const dateOrUserToday = async (
  db: AppDB,
  userId: string,
  date: string | null | undefined,
): Promise<string> => date || (await userToday(db, userId));
