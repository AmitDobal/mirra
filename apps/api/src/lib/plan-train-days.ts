/**
 * AMI-184: keep a generated week on the user's chosen train days. Pure (no D1, no clock).
 *
 * Every PlanGenerator result passes through `fitPlanToTrainDays` (factory wrapper in
 * `lib/plan-generator.ts`, and `persistGeneratedPlan` as the last guard). Sessions keep their
 * order. Sessions already on an allowed day stay; misplaced ones move to the nearest free
 * allowed day; every other day is rest. Never more lift days than `trainDays`. No train days
 * → the plan is returned unchanged (legacy behaviour).
 */
import type { GeneratedDay, PlanGenerateInput, PlanGenerateResult } from "../ports/plan-generator";
import { addDays } from "./dates";
import { parseJson } from "./json";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type TrainDaysFit = {
  result: PlanGenerateResult;
  /** Human-readable fixes ("Push day Sat → Fri"); empty when the plan already fit. */
  corrections: string[];
};

/** 1 = Mon .. 7 = Sun, unique, sorted. Accepts numbers or "mon".."sun". */
export const normalizeTrainDays = (days: readonly unknown[] | null | undefined): number[] => {
  if (!Array.isArray(days)) return [];
  const out = new Set<number>();
  for (const d of days) {
    if (typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= 7) out.add(d);
    if (typeof d === "string") {
      const i = WEEKDAYS.indexOf(d.trim().toLowerCase().slice(0, 3) as (typeof WEEKDAYS)[number]);
      if (i >= 0) out.add(i + 1);
    }
  }
  return [...out].sort((a, b) => a - b);
};

/** Train days the generator was asked to honour: the envelope first, then the prefs bundle. */
export const trainDaysOf = (input: Pick<PlanGenerateInput, "context" | "prefsJson">): number[] => {
  const fromContext = normalizeTrainDays(input.context?.profile.trainDays as unknown[] | undefined);
  if (fromContext.length > 0) return fromContext;
  return normalizeTrainDays(parseJson<{ trainDays?: unknown[] }>(input.prefsJson, {}).trainDays);
};

/** Prompt line naming the exact lift days (dayIndex 0 = Mon) and the session count. */
export const trainDaysRule = (trainDays: readonly number[]): string | null => {
  if (trainDays.length === 0) return null;
  const names = trainDays.map((d) => DAY_LABELS[d - 1]).join(", ");
  const idx = trainDays.map((d) => d - 1).join(", ");
  return `SCHEDULE (hard rule): lift ONLY on ${names} (dayIndex ${idx}). Exactly ${trainDays.length} lift days and ${trainDays.length} workouts. Every other dayIndex is kind "rest" with no workoutIndex.`;
};

type Session = { from: number; label?: string; workoutIndex: number };

const BIG = 1000;

/**
 * Order-preserving assignment of sessions to allowed day indexes: maximise matched pairs, then
 * minimise total day distance. Returns allowed-day position per session (-1 = dropped).
 */
const assign = (sessions: readonly Session[], allowed: readonly number[]): number[] => {
  const k = sessions.length;
  const n = allowed.length;
  const cost: number[][] = Array.from({ length: k + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = k; i >= 0; i--) {
    for (let j = n; j >= 0; j--) {
      if (i === k || j === n) {
        cost[i]![j] = (k - i + (n - j)) * BIG;
        continue;
      }
      const match = Math.abs(sessions[i]!.from - allowed[j]!) + cost[i + 1]![j + 1]!;
      cost[i]![j] = Math.min(match, BIG + cost[i + 1]![j]!, BIG + cost[i]![j + 1]!);
    }
  }
  const out = Array<number>(k).fill(-1);
  let i = 0;
  let j = 0;
  while (i < k && j < n) {
    const match = Math.abs(sessions[i]!.from - allowed[j]!) + cost[i + 1]![j + 1]!;
    if (cost[i]![j] === match) {
      out[i] = j;
      i += 1;
      j += 1;
    } else if (cost[i]![j] === BIG + cost[i + 1]![j]!) i += 1;
    else j += 1;
  }
  return out;
};

/** Lift sessions in day order, plus fixes for broken rows (duplicate / missing day, bad index). */
const collect = (result: PlanGenerateResult, corrections: string[]) => {
  const byIndex = new Map<number, GeneratedDay>();
  for (const d of result.days) {
    if (Number.isInteger(d.dayIndex) && d.dayIndex >= 0 && d.dayIndex <= 6 && !byIndex.has(d.dayIndex)) {
      byIndex.set(d.dayIndex, d);
    } else corrections.push(`dropped duplicate or invalid day row (dayIndex ${d.dayIndex})`);
  }
  if (result.days.length !== 7) corrections.push(`${result.days.length} day rows, expected 7`);
  const sessions: Session[] = [];
  for (let i = 0; i < 7; i++) {
    const d = byIndex.get(i);
    if (d?.kind !== "lift") continue;
    const w = d.workoutIndex;
    if (w == null || !Number.isInteger(w) || w < 0 || w >= result.workouts.length) {
      corrections.push(`${DAY_LABELS[i]} lift had no workout, now rest`);
      continue;
    }
    sessions.push({ from: i, label: d.label, workoutIndex: w });
  }
  return { byIndex, sessions };
};

export const fitPlanToTrainDays = (
  result: PlanGenerateResult,
  trainDays: readonly number[] | null | undefined,
  weekStart: string,
): TrainDaysFit => {
  const allowed = normalizeTrainDays(trainDays ?? []).map((d) => d - 1);
  if (allowed.length === 0) return { result, corrections: [] };

  const corrections: string[] = [];
  const { byIndex, sessions } = collect(result, corrections);
  const slots = assign(sessions, allowed);
  const atDay = new Map<number, Session>();
  sessions.forEach((s, i) => {
    const slot = slots[i]!;
    const title = result.workouts[s.workoutIndex]?.title ?? "Workout";
    if (slot < 0) return void corrections.push(`dropped extra session ${title} (${DAY_LABELS[s.from]})`);
    const to = allowed[slot]!;
    if (to !== s.from) corrections.push(`${title} ${DAY_LABELS[s.from]} → ${DAY_LABELS[to]}`);
    atDay.set(to, s);
  });
  if (sessions.length < allowed.length) {
    corrections.push(`${sessions.length} sessions for ${allowed.length} train days`);
  }

  // Keep only referenced workouts, in their original order.
  const used = [...new Set([...atDay.values()].map((s) => s.workoutIndex))].sort((a, b) => a - b);
  const remap = new Map(used.map((w, i) => [w, i]));
  if (used.length !== result.workouts.length) {
    corrections.push(`removed ${result.workouts.length - used.length} unscheduled workout(s)`);
  }

  const days: GeneratedDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const s = atDay.get(i);
    if (s) return { dayIndex: i, date, kind: "lift", ...(s.label ? { label: s.label } : {}), workoutIndex: remap.get(s.workoutIndex)! };
    const orig = byIndex.get(i);
    if (orig && orig.kind !== "lift") return { dayIndex: i, date, kind: orig.kind, ...(orig.label ? { label: orig.label } : {}) };
    return { dayIndex: i, date, kind: "rest", label: "Rest" };
  });
  const dateFixes = result.days.filter((d) => byIndex.get(d.dayIndex) === d && d.date !== addDays(weekStart, d.dayIndex));
  if (dateFixes.length > 0) corrections.push(`fixed ${dateFixes.length} day date(s)`);

  if (corrections.length === 0) return { result, corrections };
  return { result: { ...result, days, workouts: used.map((w) => result.workouts[w]!) }, corrections };
};

/** Fit + one log line when anything changed. */
export const enforceTrainDays = (
  result: PlanGenerateResult,
  trainDays: readonly number[] | null | undefined,
  weekStart: string,
  where: string,
): PlanGenerateResult => {
  const fit = fitPlanToTrainDays(result, trainDays, weekStart);
  if (fit.corrections.length > 0) console.warn(`[train-days] ${where}: ${fit.corrections.join("; ")}`);
  return fit.result;
};
