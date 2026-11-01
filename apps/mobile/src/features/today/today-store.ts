import { create } from "zustand";

import {
  getCurrentPlan as getLocalPlan,
  getToday as getLocalToday,
  type LocalPlan,
  type LocalPlanDay,
  type LocalWorkout,
} from "@/db";
import {
  ensureCurrentWeekPlan,
  getCurrentPlan as getApiPlan,
  getToday as getApiToday,
  type CurrentPlan,
  type PlanDay,
  type PlanWorkout,
} from "@/lib/api";
import { localTodayIso } from "@/lib/datetime";
import { usePlanStore } from "@/stores/plan-store";

import { mirrorPlanToLocal } from "./mirror-local-plan";

type TodayState = {
  readonly date: string;
  readonly workout: PlanWorkout | null;
  readonly weekDays: readonly PlanDay[];
  readonly dayIndex: number;
  /** Index of the device-calendar "today" inside `weekDays` (drives isToday copy). */
  readonly todayIndex: number;
  readonly checkInDue: boolean;
  readonly fuelRemaining: number | null;
  readonly kcalTarget: number | null;
  readonly loading: boolean;
  readonly notice: string | null;
  /** `keepSelection` re-selects the day the user already picked (Exercise hub, edits). */
  readonly hydrate: (opts?: HydrateOptions) => Promise<void>;
  readonly swapDay: () => void;
  /** Move ±1 day in the current week strip (Stitch S15 chevrons). */
  readonly shiftWeek: (delta: -1 | 1) => void;
  readonly selectDay: (index: number) => void;
  readonly clearNotice: () => void;
  readonly setNotice: (notice: string) => void;
};

type HydrateOptions = { readonly keepSelection?: boolean };

/** Device-calendar today. Server `/v1/today` is UTC and is wrong for IST after midnight. */
const todayIso = localTodayIso;

/** Mon=0 … Sun=6 for UTC calendar date. */
const mondayIndex = (iso: string): number => {
  const day = new Date(`${iso}T12:00:00.000Z`).getUTCDay();
  return day === 0 ? 6 : day - 1;
};

/** Prefer exact date; else same weekday in the stored week (plan persists past week end). */
const resolveDayIndex = (days: readonly PlanDay[], date: string): number => {
  if (!days.length) return 0;
  const byDate = days.findIndex((d) => d.date === date);
  if (byDate >= 0) return byDate;
  const byWeekday = days.findIndex((d) => d.dayIndex === mondayIndex(date));
  return byWeekday >= 0 ? byWeekday : 0;
};

const asWorkout = (w: LocalWorkout | null | undefined): PlanWorkout | null => {
  if (!w) return null;
  return {
    id: w.id,
    title: w.title,
    durationMin: w.durationMin,
    focus: w.focus,
    exercises: w.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      cue: e.cue,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      restSec: e.restSec,
    })),
  };
};

const asDay = (d: LocalPlanDay): PlanDay => ({
  id: d.id,
  dayIndex: d.dayIndex,
  date: d.date,
  kind: d.kind,
  label: d.label,
  workout: asWorkout(d.workout),
});

const asCurrent = (plan: LocalPlan): CurrentPlan => ({
  id: plan.id,
  version: plan.version,
  status: plan.status,
  weekStart: plan.weekStart,
  summary: { ...plan.summary },
  days: plan.days.map(asDay),
});

const liftDays = (days: readonly PlanDay[]) =>
  days.filter(
    (d) =>
      d.workout != null ||
      /lift|push|pull|strength|upper|lower/i.test(d.kind),
  );

const kcalFromSummary = (summary: Record<string, unknown> | undefined) => {
  const v = summary?.kcalTarget;
  return typeof v === "number" ? v : null;
};

/**
 * The plan's `days[].workout` is the only workout source. Selection follows the
 * device-calendar today unless `keepId` names a day that still exists.
 */
const applyPlan = (
  set: (partial: Partial<TodayState>) => void,
  opts: {
    date: string;
    days: readonly PlanDay[];
    checkInDue: boolean;
    fuelRemaining: number | null;
    kcalTarget: number | null;
    keepId?: string;
    /** Only used when the plan has no days at all (never for a real plan day). */
    fallbackWorkout?: PlanWorkout | null;
    notice?: string | null;
  },
) => {
  const todayIndex = resolveDayIndex(opts.days, opts.date);
  const keptIndex = opts.keepId ? opts.days.findIndex((d) => d.id === opts.keepId) : -1;
  const idx = keptIndex >= 0 ? keptIndex : todayIndex;
  const day = opts.days[idx];
  set({
    date: day?.date ?? opts.date,
    workout: day ? (day.workout ?? null) : (opts.fallbackWorkout ?? null),
    weekDays: opts.days,
    dayIndex: idx,
    todayIndex,
    checkInDue: opts.checkInDue,
    fuelRemaining: opts.fuelRemaining,
    kcalTarget: opts.kcalTarget,
    loading: false,
    notice: opts.notice ?? null,
  });
};

export const useTodayStore = create<TodayState>((set, get) => ({
  date: todayIso(),
  workout: null,
  weekDays: [],
  dayIndex: 0,
  todayIndex: 0,
  checkInDue: false,
  fuelRemaining: null,
  kcalTarget: null,
  loading: false,
  notice: null,

  clearNotice: () => set({ notice: null }),
  setNotice: (notice) => set({ notice }),

  hydrate: async (opts) => {
    // Read at apply time so a day tapped while the fetch is in flight is not overwritten.
    const pickedId = () => {
      if (!opts?.keepSelection) return undefined;
      const { weekDays, dayIndex } = get();
      return weekDays[dayIndex]?.id;
    };
    set({ loading: true });
    const date = todayIso();
    const cached = usePlanStore.getState().plan;

    try {
      const today = await getApiToday();
      let plan = await getApiPlan();
      if (!plan?.days?.length) {
        plan = await ensureCurrentWeekPlan();
      }
      if (plan?.days?.length) {
        usePlanStore.getState().setPlan(plan);
        void mirrorPlanToLocal(plan);
      }
      const days = plan?.days ?? cached?.days ?? [];
      const kcalTarget =
        today.fuel?.kcalTarget ??
        kcalFromSummary(today.summary) ??
        kcalFromSummary(plan?.summary) ??
        kcalFromSummary(cached?.summary ?? undefined);
      const fuelRemaining =
        today.fuel?.kcalRemaining ??
        today.fuelRemaining?.calories ??
        null;
      // Rest days must look like rest: no "any lift this week" fallback.
      applyPlan(set, {
        date,
        days,
        keepId: pickedId(),
        fallbackWorkout: today.workout,
        checkInDue: today.checkInDue,
        fuelRemaining,
        kcalTarget: kcalTarget ?? null,
        notice: days.length ? null : "No week plan yet — finish onboarding or rebuild in Coach",
      });
      return;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not reach API";
      set({ notice: `Today offline — ${message}` });
    }

    try {
      const [today, plan] = await Promise.all([getLocalToday(), getLocalPlan()]);
      if (plan) usePlanStore.getState().setPlan(asCurrent(plan));
      const days = plan?.days.map(asDay) ?? cached?.days ?? [];
      applyPlan(set, {
        date,
        days,
        keepId: pickedId(),
        fallbackWorkout: asWorkout(today.day?.workout),
        checkInDue: today.checkInDue,
        fuelRemaining: null,
        kcalTarget: today.summary?.kcalTarget ?? plan?.summary.kcalTarget ?? null,
      });
    } catch {
      if (cached?.days?.length) {
        applyPlan(set, {
          date,
          days: cached.days,
          keepId: pickedId(),
          checkInDue: false,
          fuelRemaining: null,
          kcalTarget: kcalFromSummary(cached.summary),
        });
        return;
      }
      set({ loading: false, notice: "Could not load today" });
    }
  },

  swapDay: () => {
    const { weekDays, dayIndex } = get();
    const lifts = liftDays(weekDays);
    if (lifts.length === 0) {
      set({ notice: "No lift days in plan yet" });
      return;
    }
    const current = weekDays[dayIndex];
    const pos = Math.max(0, lifts.findIndex((d) => d.id === current?.id));
    const next = lifts[(pos + 1) % lifts.length]!;
    const nextIndex = weekDays.findIndex((d) => d.id === next.id);
    set({
      dayIndex: nextIndex >= 0 ? nextIndex : dayIndex,
      workout: next.workout ?? get().workout,
      notice: `Swapped to ${next.label ?? next.kind}`,
    });
  },

  selectDay: (index) => {
    const { weekDays } = get();
    if (!weekDays.length) return;
    const next = Math.min(weekDays.length - 1, Math.max(0, index));
    const day = weekDays[next]!;
    set({
      dayIndex: next,
      workout: day.workout ?? null,
      date: day.date,
      notice: null,
    });
  },

  shiftWeek: (delta) => {
    const { weekDays, dayIndex } = get();
    if (!weekDays.length) {
      set({ notice: delta < 0 ? "Earlier week" : "Later week" });
      return;
    }
    const next = Math.min(weekDays.length - 1, Math.max(0, dayIndex + delta));
    const day = weekDays[next]!;
    set({
      dayIndex: next,
      workout: day.workout ?? null,
      date: day.date,
      notice: null,
    });
  },
}));
