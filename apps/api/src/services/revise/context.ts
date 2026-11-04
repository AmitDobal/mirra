import {
  toTrainerPersonaId,
  type CoachReviseBody,
  type CurrentPlanResponse,
  type DayMealPlan,
  type Macros,
} from "@mirra/contracts";
import { eq } from "drizzle-orm";

import { preferences } from "../../db/schema";
import { todayUtc } from "../../lib/dates";
import { parseJson } from "../../lib/json";
import type { PlanReviseInput } from "../../ports/plan-reviser";
import { getTodayPlan, type MealPlanCtx } from "../meal-plan";
import { defaultFuelTargets, loadCurrentPlan } from "../plan-loaders";

export type PrefsRow = typeof preferences.$inferSelect;
export type PlanWorkout = CurrentPlanResponse["workouts"][number];

/** Everything one plan-chat turn reads before deciding on an edit. */
export type ReviseState = {
  date: string;
  prefs: PrefsRow | undefined;
  equipment: string[];
  dietTags: string[];
  foodsAvoid: string | null;
  cuisineStyles: string[];
  plan: CurrentPlanResponse;
  workout: PlanWorkout | null;
  /** Rest day: the edit targets the next lift instead of today. */
  workoutIsNextLift: boolean;
  /** "Thu · Push day" for exercise rows. */
  dayLabel: string;
  mealPlan: DayMealPlan | null;
  targets: Macros;
};

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayOf = (date: string): string => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";

/** Load prefs, plan, target workout and the day's meals. Workout: context id, today, then next lift. */
export const loadReviseState = async (ctx: MealPlanCtx, body: CoachReviseBody): Promise<ReviseState> => {
  const date = body.date ?? todayUtc();
  const [prefs] = await ctx.db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, ctx.userId))
    .limit(1);
  const plan = await loadCurrentPlan(ctx.db, ctx.userId);
  const dayWorkoutId = plan.days.find((d) => d.date === date)?.workoutId ?? null;
  const requestedId = body.context?.workoutId;
  const requested = requestedId ? plan.workouts.find((w) => w.id === requestedId) : undefined;
  const nextLiftId =
    plan.days.find((d) => d.date >= date && d.workoutId)?.workoutId ??
    plan.days.find((d) => d.workoutId)?.workoutId ??
    null;
  const workout =
    requested ??
    plan.workouts.find((w) => w.id === dayWorkoutId) ??
    plan.workouts.find((w) => w.id === nextLiftId) ??
    null;
  const workoutDay =
    plan.days.find((d) => d.workoutId === workout?.id && d.date >= date) ??
    plan.days.find((d) => d.workoutId === workout?.id);
  return {
    date,
    prefs,
    equipment: parseJson<string[]>(prefs?.equipmentJson ?? "[]", []),
    dietTags: parseJson<string[]>(prefs?.dietTagsJson ?? "[]", []),
    foodsAvoid: prefs?.foodsAvoid ?? null,
    cuisineStyles: parseJson<string[]>(prefs?.cuisineJson ?? "[]", []),
    plan,
    workout,
    workoutIsNextLift: Boolean(workout && !requested && !dayWorkoutId && nextLiftId),
    dayLabel: workout ? [workoutDay ? weekdayOf(workoutDay.date) : null, workout.title].filter(Boolean).join(" · ") : "",
    mealPlan: await getTodayPlan(ctx, date),
    targets: defaultFuelTargets(plan.plan?.summary ?? null),
  };
};

/** PlanReviser port input for this turn. */
export const reviserInput = (ctx: MealPlanCtx, s: ReviseState, body: CoachReviseBody): PlanReviseInput => ({
  userId: ctx.userId,
  message: body.message,
  scope: body.scope ?? "auto",
  equipment: s.equipment,
  dietTags: s.dietTags,
  foodsAvoid: s.foodsAvoid,
  cuisineStyles: s.cuisineStyles,
  workoutTitle: s.workout?.title ?? null,
  exerciseNames: s.workout?.exercises.map((e) => e.name) ?? [],
  exercises:
    s.workout?.exercises.map((e) => ({ id: e.id, name: e.name, sets: e.targetSets, reps: e.targetReps })) ?? [],
  mealsPerDay: s.prefs?.mealsPerDay ?? null,
  meals: (s.mealPlan?.meals ?? []).map((m) => ({
    id: m.id,
    slot: m.slot,
    title: m.title,
    kcal: m.kcal,
    status: m.status,
  })),
  nutrition: {
    goal: s.prefs?.primaryGoal ?? null,
    kcalTarget: s.targets.kcal,
    proteinGTarget: s.targets.proteinG,
    lifestyleNotes: s.prefs?.lifestyleNotes ?? null,
  },
  persona: toTrainerPersonaId(s.prefs?.trainerPersona),
  today: s.date,
  schedule: s.plan.days.map((d) => ({
    date: d.date,
    weekday: weekdayOf(d.date),
    workout: s.plan.workouts.find((w) => w.id === d.workoutId)?.title ?? null,
  })),
});
