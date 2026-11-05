/** YYYY-MM-DD helpers (UTC calendar; good enough for local D1 stubs). */

export const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

export const todayUtc = (): string => toDateString(new Date());

/** Monday of the week containing `isoDate` (YYYY-MM-DD), as YYYY-MM-DD. */
export const mondayOf = (isoDate: string): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toDateString(d);
};

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
};

/** Start/end ms for a UTC calendar day. */
export const dayBoundsMs = (isoDate: string): { start: number; end: number } => {
  const start = Date.parse(`${isoDate}T00:00:00.000Z`);
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
};

export const msToUnix = (value: Date | number | null | undefined): number | null => {
  if (value == null) return null;
  return value instanceof Date ? value.getTime() : value;
};

/** Offset (ms) of IANA zone `tz` from UTC at instant `at`. Throws on a bad zone. */
const zoneOffsetMs = (tz: string, at: number): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"), n("second"));
  if (Number.isNaN(asUtc)) throw new Error(`bad zone ${tz}`);
  return asUtc - Math.floor(at / 1000) * 1000;
};

/** Epoch ms of local midnight starting `isoDate` in `tz` (two passes so DST edges land right). */
const zonedMidnightMs = (tz: string, isoDate: string): number => {
  const utcMidnight = Date.parse(`${isoDate}T00:00:00.000Z`);
  const guess = utcMidnight - zoneOffsetMs(tz, utcMidnight);
  return utcMidnight - zoneOffsetMs(tz, guess);
};

/**
 * Start/end ms of calendar day `isoDate` as lived in IANA zone `tz` (AMI-183).
 * Use for bucketing stored UTC timestamps into the user's day. Falls back to UTC bounds on a bad zone.
 */
export const dayBoundsIn = (tz: string, isoDate: string): { start: number; end: number } => {
  try {
    return { start: zonedMidnightMs(tz, isoDate), end: zonedMidnightMs(tz, addDays(isoDate, 1)) };
  } catch {
    return dayBoundsMs(isoDate);
  }
};

/** Hour 0-23 of `at` on the wall clock of IANA zone `tz` (UTC hour on a bad zone). */
export const localHourIn = (tz: string, at: Date = new Date()): number => {
  try {
    return new Date(at.getTime() + zoneOffsetMs(tz, at.getTime())).getUTCHours();
  } catch {
    return at.getUTCHours();
  }
};

/** `YYYY-MM-DD` of `at` as seen in IANA timezone `tz` (falls back to UTC on a bad zone). */
export const localDateIn = (tz: string, at: Date = new Date()): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
    return /^\d{4}-\d{2}-\d{2}$/.test(parts) ? parts : toDateString(at);
  } catch {
    return toDateString(at);
  }
};
