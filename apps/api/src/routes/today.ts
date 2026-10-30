import type { TodayResponse } from "@mirra/contracts";
import { TodayQuerySchema } from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { checkIns, meals } from "../db/schema";
import type { MirraEnv } from "../env";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { defaultFuelTargets, loadCurrentPlan } from "../services/plan-loaders";

export const todayRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

todayRoutes.get("/v1/today", requireAuth, async (c) => {
  const query = parseBody(TodayQuerySchema, {
    date: c.req.query("date") || undefined,
  });
  const date = query.date ?? todayUtc();
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const current = await loadCurrentPlan(db, userId);
  const day = current.days.find((d) => d.date === date) ?? null;
  const workout =
    day?.workoutId != null
      ? (current.workouts.find((w) => w.id === day.workoutId) ?? null)
      : null;

  const { start, end } = dayBoundsMs(date);
  const mealRows = await db.select().from(meals).where(eq(meals.userId, userId));
  const todayMeals = mealRows.filter((m) => {
    const t = m.eatenAt instanceof Date ? m.eatenAt.getTime() : Number(m.eatenAt);
    return t >= start && t < end;
  });
  const kcalLogged = todayMeals.reduce((s, m) => s + m.kcal, 0);
  const proteinGLogged = todayMeals.reduce((s, m) => s + m.proteinG, 0);
  const targets = defaultFuelTargets(current.plan?.summary ?? null);

  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, date)))
    .limit(1);

  const body: TodayResponse = {
    date,
    workout,
    day: day ? { id: day.id, kind: day.kind, label: day.label } : null,
    fuel: {
      kcalTarget: targets.kcal,
      kcalLogged,
      kcalRemaining: Math.max(0, targets.kcal - kcalLogged),
      proteinGTarget: targets.proteinG,
      proteinGLogged,
    },
    weekStrip: current.days.map((d) => ({
      date: d.date,
      dayIndex: d.dayIndex,
      kind: d.kind,
      label: d.label,
      isToday: d.date === date,
    })),
    checkInDue: !checkIn,
    summary: current.plan?.summary ?? null,
  };
  return c.json(body);
});
