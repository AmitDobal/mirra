import {
  type FuelTodayResponse,
  MealBodySchema,
  type MealResponse,
  type MealSlotSchema,
} from "@mirra/contracts";
import type { z } from "zod";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { meals } from "../db/schema";
import type { MirraEnv } from "../env";
import { dayBoundsMs, msToUnix, todayUtc } from "../lib/dates";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { defaultFuelTargets, loadCurrentPlan } from "../services/plan-loaders";

type MealSlot = z.infer<typeof MealSlotSchema>;

export const fuelRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const toMeal = (m: typeof meals.$inferSelect): MealResponse => ({
  id: m.id,
  name: m.name,
  mealSlot: m.mealSlot as MealSlot,
  kcal: m.kcal,
  proteinG: m.proteinG,
  carbsG: m.carbsG,
  fatG: m.fatG,
  eatenAt: msToUnix(m.eatenAt) ?? 0,
  mediaId: m.mediaId,
  createdAt: msToUnix(m.createdAt) ?? 0,
});

fuelRoutes.get("/v1/fuel/today", requireAuth, async (c) => {
  const date = c.req.query("date") || todayUtc();
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const current = await loadCurrentPlan(db, userId);
  const targets = defaultFuelTargets(current.plan?.summary ?? null);
  const { start, end } = dayBoundsMs(date);
  const rows = await db.select().from(meals).where(eq(meals.userId, userId));
  const dayMeals = rows
    .filter((m) => {
      const t = m.eatenAt instanceof Date ? m.eatenAt.getTime() : Number(m.eatenAt);
      return t >= start && t < end;
    })
    .map(toMeal);

  const logged = dayMeals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const body: FuelTodayResponse = {
    date,
    targets: {
      kcal: targets.kcal,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
    },
    logged,
    remaining: {
      kcal: Math.max(0, targets.kcal - logged.kcal),
      proteinG: Math.max(0, targets.proteinG - logged.proteinG),
      carbsG: Math.max(0, targets.carbsG - logged.carbsG),
      fatG: Math.max(0, targets.fatG - logged.fatG),
    },
    meals: dayMeals,
  };
  return c.json(body);
});

fuelRoutes.post("/v1/meals", requireAuth, async (c) => {
  const body = parseBody(MealBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const now = new Date();
  const eatenAt = body.eatenAt != null ? new Date(body.eatenAt) : now;
  const id = newId();

  const proteinG = body.proteinG ?? 0;
  const carbsG = body.carbsG ?? 0;
  const fatG = body.fatG ?? 0;

  await db.insert(meals).values({
    id,
    userId,
    eatenAt,
    name: body.name,
    mealSlot: body.mealSlot,
    kcal: body.kcal,
    proteinG,
    carbsG,
    fatG,
    mediaId: body.mediaId ?? null,
    createdAt: now,
  });

  const response: MealResponse = {
    id,
    name: body.name,
    mealSlot: body.mealSlot,
    kcal: body.kcal,
    proteinG,
    carbsG,
    fatG,
    eatenAt: eatenAt.getTime(),
    mediaId: body.mediaId ?? null,
    createdAt: now.getTime(),
  };
  return c.json(response, 201);
});
