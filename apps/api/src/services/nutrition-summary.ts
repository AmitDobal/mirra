import type { NutritionSummaryResponse } from "@mirra/contracts";
import { and, eq, gte, lt, between } from "drizzle-orm";

import type { AppDB } from "../db";
import { meals, nutritionDayRollup } from "../db/schema";
import { toDateString } from "../lib/dates";
import { historyWindow, windowBoundsMs, type HistoryRange } from "../lib/history-window";
import { loadKcalTarget, rebuildDayRollup, type RollupRow } from "./nutrition-rollup";
import { loadSessionStats } from "./workout-stats";

/** Days that have data but no cached rollup row yet (pre-rollup history). Empty users cost two cheap queries. */
const daysWithData = async (
  db: AppDB,
  userId: string,
  window: { from: string; to: string },
): Promise<Set<string>> => {
  const { start, end } = windowBoundsMs(window);
  const mealRows = await db
    .select({ eatenAt: meals.eatenAt })
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.eatenAt, new Date(start)), lt(meals.eatenAt, new Date(end))));
  const sessions = await loadSessionStats(db, userId, start, end);
  return new Set([...mealRows.map((m) => toDateString(m.eatenAt)), ...sessions.map((s) => s.date)]);
};

export const loadNutritionSummary = async (
  db: AppDB,
  userId: string,
  range: HistoryRange,
  anchor: string,
): Promise<NutritionSummaryResponse> => {
  const window = historyWindow(range, anchor);
  const target = await loadKcalTarget(db, userId);

  const cached = await db
    .select()
    .from(nutritionDayRollup)
    .where(
      and(
        eq(nutritionDayRollup.userId, userId),
        between(nutritionDayRollup.localDate, window.from, window.to),
      ),
    );
  const byDate = new Map<string, RollupRow>(cached.map((r) => [r.localDate, r]));

  if (byDate.size < window.dates.length) {
    const withData = await daysWithData(db, userId, window);
    for (const date of window.dates) {
      if (byDate.has(date) || !withData.has(date)) continue;
      byDate.set(date, await rebuildDayRollup(db, userId, date, target));
    }
  }

  const series = window.dates.map((date) => {
    const r = byDate.get(date);
    return {
      date,
      kcalIn: r?.kcalIn ?? 0,
      proteinG: r?.proteinG ?? 0,
      carbsG: r?.carbsG ?? 0,
      fatG: r?.fatG ?? 0,
      kcalTarget: r?.kcalTarget ?? target,
      workoutMinutes: r?.workoutMinutes ?? 0,
      setsCompleted: r?.setsCompleted ?? 0,
    };
  });

  const logged = series.filter((d) => d.kcalIn > 0);
  const kcalIn = series.reduce((a, d) => a + d.kcalIn, 0);
  const sum = (key: "proteinG" | "carbsG" | "fatG") =>
    Math.round(series.reduce((a, d) => a + d[key], 0) * 10) / 10;

  return {
    range,
    anchor,
    from: window.from,
    to: window.to,
    series,
    totals: {
      kcalIn,
      proteinG: sum("proteinG"),
      carbsG: sum("carbsG"),
      fatG: sum("fatG"),
      daysLogged: logged.length,
      avgKcalPerLoggedDay: logged.length ? Math.round(kcalIn / logged.length) : 0,
      daysOnTarget: logged.filter(
        (d) => d.kcalTarget > 0 && d.kcalIn >= d.kcalTarget * 0.9 && d.kcalIn <= d.kcalTarget * 1.1,
      ).length,
    },
  };
};
