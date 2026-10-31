import { create } from "zustand";

import {
  getCurrentPlan as getLocalPlan,
  getToday as getLocalToday,
  type LocalPlan,
  type LocalPlanDay,
  type LocalWorkout,
} from "@/db";
import {
  getCurrentPlan as getApiPlan,
  getToday as getApiToday,
  type CurrentPlan,
  type PlanDay,
  type PlanWorkout,
} from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";

type TodayState = {
  readonly date: string;
  readonly workout: PlanWorkout | null;
  readonly weekDays: readonly PlanDay[];
  readonly dayIndex: number;
  readonly checkInDue: boolean;
  readonly fuelRemaining: number | null;
  readonly kcalTarget: number | null;
  readonly loading: boolean;
  readonly notice: string | null;
  readonly hydrate: () => Promise<void>;
  readonly swapDay: () => void;
  /** Move ±1 day in the current week strip (Stitch S15 chevrons). */
  readonly shiftWeek: (delta: -1 | 1) => void;
  readonly selectDay: (index: number) => void;
  readonly clearNotice: () => void;
  readonly setNotice: (notice: string) => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

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

export const useTodayStore = create<TodayState>((set, get) => ({
  date: todayIso(),
  workout: null,
  weekDays: [],
  dayIndex: 0,
  checkInDue: false,
  fuelRemaining: null,
  kcalTarget: null,
  loading: false,
  notice: null,

  clearNotice: () => set({ notice: null }),
  setNotice: (notice) => set({ notice }),

  hydrate: async () => {
    set({ loading: true });
    const date = todayIso();
    const cached = usePlanStore.getState().plan;

    try {
      const [today, plan] = await Promise.all([getApiToday(), getApiPlan()]);
      if (plan?.days?.length) usePlanStore.getState().setPlan(plan);
      const days = plan?.days ?? cached?.days ?? [];
      const idx = Math.max(
        0,
        days.findIndex((d) => d.date === (today.date ?? date)),
      );
      // Never fall back to "any lift this week" — rest days must look like rest.
      const workout = today.workout ?? days[idx]?.workout ?? null;
      const kcalTarget =
        today.fuel?.kcalTarget ??
        kcalFromSummary(today.summary) ??
        kcalFromSummary(plan?.summary) ??
        kcalFromSummary(cached?.summary ?? undefined);
      const fuelRemaining =
        today.fuel?.kcalRemaining ??
        today.fuelRemaining?.calories ??
        null;
      set({
        date: today.date ?? date,
        workout,
        weekDays: days,
        dayIndex: idx >= 0 ? idx : 0,
        checkInDue: today.checkInDue,
        fuelRemaining,
        kcalTarget: kcalTarget ?? null,
        loading: false,
        notice: null,
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
      const idx = Math.max(
        0,
        days.findIndex((d) => d.date === (today.date ?? date)),
      );
      const workout = asWorkout(today.day?.workout) ?? days[idx]?.workout ?? null;
      set({
        date: today.date ?? date,
        workout,
        weekDays: days,
        dayIndex: idx >= 0 ? idx : 0,
        checkInDue: today.checkInDue,
        fuelRemaining: null,
        kcalTarget: today.summary?.kcalTarget ?? plan?.summary.kcalTarget ?? null,
        loading: false,
      });
    } catch {
      if (cached?.days?.length) {
        const idx = Math.max(
          0,
          cached.days.findIndex((d) => d.date === date),
        );
        set({
          date,
          workout: cached.days[idx]?.workout ?? null,
          weekDays: cached.days,
          dayIndex: idx >= 0 ? idx : 0,
          loading: false,
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
