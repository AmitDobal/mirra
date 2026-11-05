import { localDayBoundsMs, localTodayIso } from "@/lib/datetime";

/**
 * YYYY-MM-DD helpers for the local-first stubs.
 * "Today" and day bounds follow the device calendar (AMI-183); `mondayOf` /
 * `addDays` are pure calendar arithmetic on date strings (UTC math is exact there).
 */

export const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

/** Device-local today. */
export const todayLocal = (): string => localTodayIso();

export const mondayOf = (isoDate: string): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toDateString(d);
};

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
};

/** Device-local midnight-to-midnight bounds for `isoDate`. */
export const dayBoundsMs = (isoDate: string): { start: number; end: number } => localDayBoundsMs(isoDate);
