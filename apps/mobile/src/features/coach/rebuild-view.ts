import type { CurrentPlan, PlanDay } from "@/lib/api/types";

/** S21 rebuilt-schedule row (after plan), with the before slot for the same date. */
export type RebuildRow = {
  readonly date: string;
  /** "THU" (from the plan date, not the device clock). */
  readonly weekday: string;
  /** "Today" | "Day 2" | "Rest". */
  readonly tag: string;
  readonly isToday: boolean;
  readonly isRest: boolean;
  readonly title: string;
  readonly minutes: number | null;
  /** Sub-line: what changed vs the current plan, else the session focus. */
  readonly note: string | null;
  readonly changed: boolean;
};

/** S21 "Original Schedule" row (current plan) for the same dates. */
export type OriginalRow = {
  readonly date: string;
  readonly weekday: string;
  readonly title: string;
  readonly minutes: number | null;
  readonly changed: boolean;
};

export type RebuildMetrics = {
  readonly sets: number;
  /** after sets / before sets, 0–100+; null when there is no before plan. */
  readonly volumeMatchPct: number | null;
  readonly kcal: number | null;
  readonly kcalDelta: number | null;
  /** Shortest gap between two remaining sessions, in hours; null with < 2 sessions. */
  readonly recoveryHours: number | null;
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** Weekday of a `YYYY-MM-DD` calendar date (timezone-free). */
export const weekdayOf = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "";
};

const dayNumber = (iso: string): number => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000;
};

const isRestDay = (d: PlanDay | undefined): boolean => !d?.workout;
const titleOf = (d: PlanDay | undefined): string =>
  d?.workout?.title ?? (d?.label && d.label !== "rest" ? d.label : "Rest day");
const slotKey = (d: PlanDay | undefined): string =>
  d?.workout ? `w:${d.workout.title}:${d.workout.durationMin}` : "rest";

/**
 * Remaining days of the week from `today` (device calendar). Falls back to the first
 * days when the whole plan is in the past or future so the screen is never empty.
 */
export const windowDays = (plan: CurrentPlan | null, today: string, limit = 4): readonly PlanDay[] => {
  if (!plan) return [];
  const upcoming = plan.days.filter((d) => d.date >= today);
  return (upcoming.length > 0 ? upcoming : plan.days).slice(0, limit);
};

export const rebuildRows = (
  after: CurrentPlan | null,
  before: CurrentPlan | null,
  today: string,
  limit = 4,
): readonly RebuildRow[] =>
  windowDays(after, today, limit).map((d, i) => {
    const prev = before?.days.find((b) => b.date === d.date);
    const changed = before != null && slotKey(prev) !== slotKey(d);
    const isToday = d.date === today;
    const rest = isRestDay(d);
    return {
      date: d.date,
      weekday: weekdayOf(d.date),
      tag: isToday ? "Today" : rest ? "Rest" : `Day ${i + 1}`,
      isToday,
      isRest: rest,
      title: titleOf(d),
      minutes: d.workout?.durationMin ?? null,
      note: changed ? `Was ${titleOf(prev)}` : (d.workout?.focus ?? (rest ? "Recovery day" : null)),
      changed,
    };
  });

export const originalRows = (
  before: CurrentPlan | null,
  after: CurrentPlan | null,
  today: string,
  limit = 4,
): readonly OriginalRow[] => {
  const dates = windowDays(after ?? before, today, limit).map((d) => d.date);
  return dates.flatMap((date) => {
    const d = before?.days.find((b) => b.date === date);
    if (!d) return [];
    const next = after?.days.find((a) => a.date === date);
    return [
      {
        date,
        weekday: weekdayOf(date),
        title: titleOf(d),
        minutes: d.workout?.durationMin ?? null,
        changed: after != null && slotKey(next) !== slotKey(d),
      },
    ];
  });
};

const totalSets = (plan: CurrentPlan): number =>
  plan.days.reduce(
    (sum, d) => sum + (d.workout?.exercises.reduce((s, e) => s + e.targetSets, 0) ?? 0),
    0,
  );

const kcalOf = (plan: CurrentPlan | null): number | null => {
  const v = plan?.summary?.kcalTarget;
  return typeof v === "number" ? v : null;
};

export const rebuildMetrics = (
  after: CurrentPlan | null,
  before: CurrentPlan | null,
  today: string,
): RebuildMetrics => {
  const sets = after ? totalSets(after) : 0;
  const beforeSets = before ? totalSets(before) : 0;
  const kcal = kcalOf(after);
  const beforeKcal = kcalOf(before);
  const lifts = (after?.days ?? []).filter((d) => d.workout && d.date >= today).map((d) => dayNumber(d.date));
  let gap: number | null = null;
  for (let i = 1; i < lifts.length; i++) {
    const g = (lifts[i]! - lifts[i - 1]!) * 24;
    gap = gap == null ? g : Math.min(gap, g);
  }
  return {
    sets,
    volumeMatchPct: before && beforeSets > 0 ? Math.round((sets / beforeSets) * 100) : null,
    kcal,
    kcalDelta: kcal != null && beforeKcal != null ? kcal - beforeKcal : null,
    recoveryHours: gap,
  };
};

/** One or two plain sentences for the coach insight card. */
export const changeSummary = (rows: readonly RebuildRow[]): string => {
  const moved = rows.filter((r) => r.changed);
  if (moved.length === 0) return "Your remaining days already fit. Nothing needs to move.";
  const lines = moved.slice(0, 2).map((r) => {
    const day = r.isToday ? "today" : r.weekday.charAt(0) + r.weekday.slice(1).toLowerCase();
    return r.isRest ? `${day} becomes a rest day` : `${r.title} lands on ${day}`;
  });
  const first = lines.join(" and ");
  const extra = moved.length > 2 ? ` Plus ${moved.length - 2} more change${moved.length > 3 ? "s" : ""}.` : "";
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}.${extra}`;
};
