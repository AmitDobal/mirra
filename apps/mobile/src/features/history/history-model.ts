import type { RollupDay } from "@/db";
import type { HistoryRange, NutritionSummary, WorkoutSummary } from "@/lib/api";

/** Display placeholder for any metric with no data (never `0` or `$0k`). */
export const NA = "N/A";

export type HistoryWindow = {
  readonly from: string;
  readonly to: string;
  readonly dates: readonly string[];
};

export type HistoryDay = {
  readonly date: string;
  readonly kcalIn: number;
  readonly kcalTarget: number | null;
  readonly workoutMinutes: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly logged: boolean;
};

export type HistoryKpis = {
  readonly avgDaily: number | null;
  readonly daysOnTarget: number;
  readonly daysLogged: number;
  readonly workoutSessions: number;
  readonly workoutMinutes: number;
  /** Target in the window (latest known), `null` when none. */
  readonly target: number | null;
};

export type MacroAverages = {
  readonly proteinG: number | null;
  readonly carbsG: number | null;
  readonly fatG: number | null;
};

const DAY_MS = 86_400_000;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);

const mondayOf = (iso: string): string => {
  const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
};

/** Mirrors the API `historyWindow`: the day, Monday–Sunday week, or calendar month (UTC). */
export const historyWindow = (range: HistoryRange, anchor: string): HistoryWindow => {
  let from = anchor;
  let to = anchor;
  if (range === "week") {
    from = mondayOf(anchor);
    to = addDays(from, 6);
  }
  if (range === "month") {
    from = `${anchor.slice(0, 7)}-01`;
    const end = new Date(`${from}T00:00:00.000Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    to = end.toISOString().slice(0, 10);
  }
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return { from, to, dates };
};

/** Move the anchor one window back (-1) or forward (+1). */
export const shiftAnchor = (range: HistoryRange, anchor: string, dir: -1 | 1): string => {
  if (range === "day") return addDays(anchor, dir);
  if (range === "week") return addDays(anchor, dir * 7);
  const d = new Date(`${anchor.slice(0, 7)}-01T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + dir);
  return d.toISOString().slice(0, 10);
};

const fmtMonthDay = (iso: string): string =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const windowLabel = (range: HistoryRange, w: HistoryWindow): string => {
  if (range === "day") {
    return new Date(`${w.from}T00:00:00.000Z`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  if (range === "month") {
    return new Date(`${w.from}T00:00:00.000Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return `${fmtMonthDay(w.from)} – ${fmtMonthDay(w.to)}`;
};

/** Weekday letter + day number, e.g. `M 13`. */
export const dayTick = (iso: string, range: HistoryRange): string => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (range === "month") return String(d.getUTCDate());
  const letter = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).slice(0, 1);
  return `${letter} ${d.getUTCDate()}`;
};

const emptyDay = (date: string): HistoryDay => ({
  date,
  kcalIn: 0,
  kcalTarget: null,
  workoutMinutes: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  logged: false,
});

const toDay = (d: Omit<HistoryDay, "logged">): HistoryDay => ({ ...d, logged: d.kcalIn > 0 });

/** Zero-filled days for the window from API payloads (workout series wins for minutes). */
export const mergeSummaries = (
  w: HistoryWindow,
  nutrition: NutritionSummary,
  workouts: WorkoutSummary | null,
): HistoryDay[] => {
  const nByDate = new Map(nutrition.series.map((d) => [d.date, d]));
  const wByDate = new Map((workouts?.series ?? []).map((d) => [d.date, d]));
  return w.dates.map((date) => {
    const n = nByDate.get(date);
    if (!n) return emptyDay(date);
    return toDay({
      date,
      kcalIn: n.kcalIn,
      kcalTarget: n.kcalTarget > 0 ? n.kcalTarget : null,
      workoutMinutes: wByDate.get(date)?.minutes ?? n.workoutMinutes,
      proteinG: n.proteinG,
      carbsG: n.carbsG,
      fatG: n.fatG,
    });
  });
};

/** Days read back from the SQLite rollup cache, zero-filled over the window. */
export const fromRollups = (w: HistoryWindow, rows: readonly RollupDay[]): HistoryDay[] => {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return w.dates.map((date) => {
    const r = byDate.get(date);
    if (!r) return emptyDay(date);
    return toDay({
      date,
      kcalIn: r.kcalIn,
      kcalTarget: r.kcalTarget,
      workoutMinutes: r.workoutMinutes,
      proteinG: r.proteinG,
      carbsG: r.carbsG,
      fatG: r.fatG,
    });
  });
};

export const toRollups = (days: readonly HistoryDay[]): RollupDay[] =>
  days.map((d) => ({
    date: d.date,
    kcalIn: d.kcalIn,
    proteinG: d.proteinG,
    carbsG: d.carbsG,
    fatG: d.fatG,
    kcalTarget: d.kcalTarget,
    workoutMinutes: d.workoutMinutes,
    setsCompleted: 0,
  }));

const latestTarget = (days: readonly HistoryDay[]): number | null => {
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const t = days[i]?.kcalTarget;
    if (t) return t;
  }
  return null;
};

const onTarget = (d: HistoryDay): boolean =>
  d.logged && d.kcalTarget !== null && d.kcalIn >= d.kcalTarget * 0.9 && d.kcalIn <= d.kcalTarget * 1.1;

export const computeKpis = (days: readonly HistoryDay[], workouts: WorkoutSummary | null): HistoryKpis => {
  const logged = days.filter((d) => d.logged);
  const kcal = logged.reduce((a, d) => a + d.kcalIn, 0);
  const minutes = days.reduce((a, d) => a + d.workoutMinutes, 0);
  const trainedDays = days.filter((d) => d.workoutMinutes > 0).length;
  return {
    avgDaily: logged.length ? Math.round(kcal / logged.length) : null,
    daysOnTarget: days.filter(onTarget).length,
    daysLogged: logged.length,
    workoutSessions: workouts?.totals.sessions ?? trainedDays,
    workoutMinutes: minutes,
    target: latestTarget(days),
  };
};

/** Average macros per logged day, `null` when nothing was logged. */
export const macroAverages = (days: readonly HistoryDay[]): MacroAverages => {
  const logged = days.filter((d) => d.logged);
  if (logged.length === 0) return { proteinG: null, carbsG: null, fatG: null };
  const avg = (pick: (d: HistoryDay) => number) =>
    Math.round(logged.reduce((a, d) => a + pick(d), 0) / logged.length);
  return {
    proteinG: avg((d) => d.proteinG),
    carbsG: avg((d) => d.carbsG),
    fatG: avg((d) => d.fatG),
  };
};

export const fmtKcal = (n: number | null): string => (n === null ? NA : n.toLocaleString("en-US"));

export const fmtMinutes = (n: number): string => {
  if (n <= 0) return NA;
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Over target when intake exceeds that day's target (bar turns lavender). */
export const isOver = (d: HistoryDay): boolean =>
  d.kcalTarget !== null && d.kcalIn > d.kcalTarget;

export const hasAnyData = (days: readonly HistoryDay[]): boolean =>
  days.some((d) => d.logged || d.workoutMinutes > 0);
