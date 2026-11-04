/**
 * Calendar-date math on `YYYY-MM-DD` strings with integer day numbers.
 * No `Date` objects, so no time zone or DST drift: a local date plus 7 is always
 * the same weekday one week later, wherever the device or Worker runs.
 */
import type { IsoDate } from "./types";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a proleptic Gregorian date (H. Hinnant's algorithm). */
const daysFromCivil = (y0: number, m: number, d: number): number => {
  const y = m <= 2 ? y0 - 1 : y0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
};

const civilFromDays = (z0: number): [number, number, number] => {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
};

const pad = (n: number, w: number) => String(n).padStart(w, "0");

export const isIsoDate = (s: string): boolean => {
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const [y2, m2, d2] = civilFromDays(daysFromCivil(y, mo, d));
  return y2 === y && m2 === mo && d2 === d;
};

/** Epoch day number of a local date. Throws on a malformed date (caller bug). */
export const dayNumber = (s: IsoDate): number => {
  if (!isIsoDate(s)) throw new Error(`goal-engine: invalid date "${s}"`);
  const m = ISO_RE.exec(s)!;
  return daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]));
};

export const fromDayNumber = (n: number): IsoDate => {
  const [y, m, d] = civilFromDays(Math.round(n));
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
};

export const addDays = (s: IsoDate, days: number): IsoDate => fromDayNumber(dayNumber(s) + Math.round(days));

/** `a − b` in whole days. */
export const diffDays = (a: IsoDate, b: IsoDate): number => dayNumber(a) - dayNumber(b);

export const maxDate = (a: IsoDate, b: IsoDate): IsoDate => (dayNumber(a) >= dayNumber(b) ? a : b);

/** ETA rule (§3): origin + round(weeks × 7) days. */
export const dateAfterWeeks = (origin: IsoDate, weeks: number): IsoDate => addDays(origin, Math.round(weeks * 7));
