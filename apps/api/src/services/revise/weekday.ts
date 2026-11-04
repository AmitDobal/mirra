/** Pure weekday parsing for plan chat ("add face pulls to Monday", "move Thu to Sat"). */
import { canonicalDay } from "../../lib/plan-refs";

const PREFIX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_WORD = /\b(today|tomorrow|(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?)\b/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** First day word in free text ("monday", "thu", "tomorrow"), lowercased; null when none. */
export const namedDayIn = (text: string): string | null => DAY_WORD.exec(text)?.[1]?.toLowerCase() ?? null;

export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const utcDay = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

const inDays = (r: string): number | null => {
  const m = /^in ([1-6]) days$/.exec(r);
  return m ? Number(m[1]) : null;
};

/** 0 = Sunday .. 6 = Saturday for a day word or ISO date; -1 when unknown. */
export const dayIndexOf = (ref: string, today: string): number => {
  const r = canonicalDay(ref) ?? ref.trim().toLowerCase();
  if (r === "today") return utcDay(today);
  if (r === "tomorrow") return utcDay(addDays(today, 1));
  const n = inDays(r);
  if (n != null) return utcDay(addDays(today, n));
  if (ISO.test(r)) return utcDay(r);
  return PREFIX[r.replace(/^next /, "").slice(0, 3)] ?? -1;
};

export type DateRefOpts = {
  /** Rank weekend candidates: lower wins (e.g. rest days first when moving a session there). */
  rank?: (date: string) => number;
};

/** Weekend dates (Sat, Sun) of the first weekend on/after `from`, inside `dates`. */
const weekendOf = (from: string, dates: readonly string[]): string[] => {
  const sat = dates.find((d) => d >= from && (utcDay(d) === 6 || utcDay(d) === 0));
  if (!sat) return [];
  const end = utcDay(sat) === 6 ? addDays(sat, 1) : sat;
  return dates.filter((d) => d >= sat && d <= end);
};

/**
 * Plan date a reference points at. ISO dates, today/tomorrow and "in N days" are exact; a
 * weekday is its next occurrence in `dates` (today or later), else its earlier occurrence
 * (a past day); "next monday" is the first one after today; "weekend" picks this weekend's
 * best-ranked day.
 */
export const dateForRef = (ref: string, today: string, dates: readonly string[], opts: DateRefOpts = {}): string | null => {
  const r = canonicalDay(ref);
  if (!r) return null;
  if (ISO.test(r)) return r;
  if (r === "today") return today;
  if (r === "tomorrow") return addDays(today, 1);
  const n = inDays(r);
  if (n != null) return addDays(today, n);
  if (r === "weekend" || r === "next weekend") {
    const sorted = [...dates].sort();
    let days = weekendOf(today, sorted);
    if (r === "next weekend") days = days.length > 0 ? weekendOf(addDays(days.at(-1)!, 1), sorted) : [];
    const rank = opts.rank ?? (() => 0);
    return [...days].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0] ?? null;
  }
  const idx = dayIndexOf(r, today);
  if (idx < 0) return null;
  const hits = dates.filter((d) => utcDay(d) === idx);
  if (r.startsWith("next ")) return hits.find((d) => d > today) ?? null;
  return hits.find((d) => d >= today) ?? hits[0] ?? null;
};
