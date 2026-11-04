/** Pure weekday parsing for plan chat ("add face pulls to Monday", "move Thu to Sat"). */

const PREFIX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_WORD = /\b(today|tomorrow|(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?)\b/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** First day word in free text ("monday", "thu", "tomorrow"), lowercased; null when none. */
export const namedDayIn = (text: string): string | null => DAY_WORD.exec(text)?.[1]?.toLowerCase() ?? null;

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const utcDay = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/** 0 = Sunday .. 6 = Saturday for a day word or ISO date; -1 when unknown. */
export const dayIndexOf = (ref: string, today: string): number => {
  const r = ref.trim().toLowerCase();
  if (r === "today") return utcDay(today);
  if (r === "tomorrow") return utcDay(addDays(today, 1));
  if (ISO.test(r)) return utcDay(r);
  return PREFIX[r.slice(0, 3)] ?? -1;
};

/**
 * Plan date a reference points at. ISO dates and today/tomorrow are exact; a weekday is its
 * next occurrence in `dates` (today or later), else its earlier occurrence (a past day).
 */
export const dateForRef = (ref: string, today: string, dates: readonly string[]): string | null => {
  const r = ref.trim().toLowerCase();
  if (ISO.test(r)) return r;
  if (r === "today") return today;
  if (r === "tomorrow") return addDays(today, 1);
  const idx = dayIndexOf(r, today);
  if (idx < 0) return null;
  const hits = dates.filter((d) => utcDay(d) === idx);
  return hits.find((d) => d >= today) ?? hits[0] ?? null;
};
