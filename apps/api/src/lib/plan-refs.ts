/**
 * Day and workout references for plan chat (AMI-173): "tomorrow", "next Monday", "this
 * weekend", "legs", "my upper body workout". Pure. Canonical refs stay ≤16 chars because
 * the intent is echoed back by installed clients (`CoachReviseIntentSchema` max 16).
 */

const WD = "(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?";

/** Spoken day phrases (regex source, no groups). */
export const DAY_PHRASE = `(?:today|tonight|tomorrow|tmrw|tmr|(?:the\\s+)?day\\s+after\\s+tomorrow|in\\s+[1-6]\\s+days?|(?:this|next|coming)\\s+(?:weekend|${WD})|(?:the\\s+)?weekend|${WD}|\\d{4}-\\d{2}-\\d{2})`;

const FULL: Record<string, string> = {
  sun: "sunday", mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday",
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY = new RegExp(`^${WD}$`);

const weekday = (w: string): string | null => (WEEKDAY.test(w) ? FULL[w.slice(0, 3)] ?? null : null);

/**
 * Canonical day ref or null: today, tomorrow, "in 2 days", monday, "next monday", weekend,
 * "next weekend", YYYY-MM-DD.
 */
export const canonicalDay = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/'s$/, "").replace(/^(?:on|the)\s+/, "").replace(/\s+/g, " ");
  if (ISO.test(s)) return s;
  if (s === "today" || s === "tonight") return "today";
  if (s === "tomorrow" || s === "tmrw" || s === "tmr") return "tomorrow";
  if (/^(?:the )?day after tomorrow$/.test(s)) return "in 2 days";
  const inN = /^in ([1-6]) days?$/.exec(s);
  if (inN) return inN[1] === "1" ? "tomorrow" : `in ${inN[1]} days`;
  if (/^(?:(?:this|coming) )?weekend$/.test(s)) return "weekend";
  if (s === "next weekend") return "next weekend";
  const m = /^(?:(this|coming|next) )?(\S+)$/.exec(s);
  const day = m ? weekday(m[2]!) : null;
  if (!day) return null;
  return m![1] === "next" ? `next ${day}` : day;
};

/** First day phrase inside free text, canonical ("move legs from tue to fri" -> "tuesday"). */
export const dayIn = (text: string): string | null => {
  const hit = new RegExp(`\\b${DAY_PHRASE}\\b`).exec(text.toLowerCase());
  return hit ? canonicalDay(hit[0]) : null;
};

const FILLER = new Set([
  "my", "the", "our", "this", "that", "a", "workout", "workouts", "session", "sessions", "training", "lift",
  "lifting", "routine", "day", "days", "sesh", "wala", "wali", "wale", "ko", "plan", "s", "one",
]);

/**
 * Canonical workout ref ("my upper body workout" -> "upper body", "leg day" -> "leg"), or
 * null when nothing is left or it is a day phrase.
 */
export const workoutRef = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const words = raw
    .toLowerCase()
    .replace(/'s\b/g, "")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w));
  if (words.length === 0 || words.length > 4) return null;
  const ref = words.join(" ");
  if (canonicalDay(ref)) return null;
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > 16) break;
    out = next;
  }
  return out.length >= 2 ? out : null;
};

/** Plan day ref for `scheduleMoves`: a day phrase first, else a workout name. */
export const moveRef = (raw: unknown): string | null => canonicalDay(raw) ?? workoutRef(raw);
