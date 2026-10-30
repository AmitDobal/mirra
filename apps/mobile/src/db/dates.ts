/** YYYY-MM-DD helpers (UTC calendar for local-first stubs). */

export const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

export const todayUtc = (): string => toDateString(new Date());

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

export const dayBoundsMs = (isoDate: string): { start: number; end: number } => {
  const start = Date.parse(`${isoDate}T00:00:00.000Z`);
  return { start, end: start + 86_400_000 };
};
