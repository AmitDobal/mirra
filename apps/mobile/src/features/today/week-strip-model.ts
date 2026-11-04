/**
 * S42 Today week strip view model (AMI-176). Pure: plan week + presence in, 7 day cells out.
 * Dates are device-calendar `YYYY-MM-DD`; weeks start Monday.
 */
export type Presence = "none" | "open" | "active";

/** `flame` = completed workout · `dot` = presence without a workout (check-in, meal, open) · `none`. */
export type DayMarker = "flame" | "dot" | "none";

export type StripDay = {
  readonly letter: string;
  readonly dayNum: number;
  readonly date: string;
  readonly index: number;
  /** Day the Today screen is showing (lime fill). */
  readonly selected: boolean;
  /** Device-calendar today (lime ring when not selected). */
  readonly isToday: boolean;
};

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atNoon = (date: string) => new Date(`${date}T12:00:00`);

/** Monday of the week containing `date` (local calendar). */
export const mondayOf = (date: string): string => {
  const d = atNoon(date);
  const back = (d.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  d.setDate(d.getDate() - back);
  return iso(d);
};

export const addDaysIso = (date: string, n: number): string => {
  const d = atNoon(date);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/**
 * Seven cells. With a plan, cells follow the plan's dates; without one (no plan yet) the
 * strip shows the real Monday-first week around `today` with today selected — so letters
 * and dates always agree (QA: no-plan strip was shifted by one day).
 */
export const buildStrip = (
  planDates: readonly string[],
  dayIndex: number,
  today: string,
): StripDay[] => {
  const hasPlan = planDates.length > 0;
  const start = mondayOf(today);
  const dates = hasPlan ? planDates.slice(0, 7) : LETTERS.map((_, i) => addDaysIso(start, i));
  const selectedIdx = hasPlan ? dayIndex % 7 : dates.indexOf(today);
  return dates.map((date, i) => ({
    letter: LETTERS[(atNoon(date).getDay() + 6) % 7] ?? "·",
    dayNum: Number(date.slice(-2)) || i + 1,
    date,
    index: i,
    selected: i === selectedIdx,
    isToday: date === today,
  }));
};

/** Never mark the future. A logged workout wins over plain presence. */
export const markerFor = (
  date: string,
  today: string,
  presence: Readonly<Record<string, Presence>>,
  workoutDone: Readonly<Record<string, boolean>>,
): DayMarker => {
  if (date > today) return "none";
  if (workoutDone[date]) return "flame";
  return (presence[date] ?? "none") === "none" ? "none" : "dot";
};
