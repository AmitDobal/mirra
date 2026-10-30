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
