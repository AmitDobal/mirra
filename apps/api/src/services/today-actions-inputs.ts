import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { meals } from "../db/schema";
import { dayBoundsIn } from "../lib/dates";
import { loadHydration } from "./hydration";
import { buildPersonalDayContext } from "./personal-context";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";
import type { TodayActionsInput } from "./today-actions";
import { userTz } from "./user-day";

/** I/O for `GET /v1/today/actions`: one personal-day pack plus carbs, fat, workout, water. */
export const loadTodayActionsInput = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<TodayActionsInput> => {
  const tz = await userTz(db, userId);
  const { start, end } = dayBoundsIn(tz, date);
  const [ctx, current, dayMeals, hydration] = await Promise.all([
    buildPersonalDayContext(db, userId, date),
    loadCurrentPlan(db, userId),
    db
      .select({ carbsG: meals.carbsG, fatG: meals.fatG })
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.eatenAt, new Date(start)),
          lt(meals.eatenAt, new Date(end)),
        ),
      ),
    loadHydration(db, userId, date),
  ]);

  const targets = defaultFuelTargets(current.plan?.summary ?? null);
  const day = current.days.find((d) => d.date === date) ?? null;
  const workout =
    day?.workoutId != null
      ? (current.workouts.find((w) => w.id === day.workoutId) ?? null)
      : null;

  return {
    date,
    tz,
    scenario: ctx.scenario,
    facts: ctx.facts,
    mealCount: ctx.fuel.mealCount,
    workout: workout
      ? {
          id: workout.id,
          title: workout.title,
          durationMin: workout.durationMin,
          exerciseCount: workout.exercises.length,
        }
      : null,
    carbsG: {
      target: targets.carbsG,
      logged: dayMeals.reduce((s, m) => s + m.carbsG, 0),
    },
    fatG: { target: targets.fatG, logged: dayMeals.reduce((s, m) => s + m.fatG, 0) },
    hydration,
  };
};
