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
