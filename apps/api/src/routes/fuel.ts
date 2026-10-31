import {
  type FuelTodayResponse,
  type MealListResponse,
  MealBodySchema,
  type MealDeleteResponse,
  MealPatchBodySchema,
  MealEstimateBodySchema,
  type MealEstimateResponse,
} from "@mirra/contracts";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { meals } from "../db/schema";
import type { MirraEnv } from "../env";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { getMealEstimator } from "../lib/meal-estimator";
import { decodeCursor, olderThan, parsePageQuery, toPage } from "../lib/pagination";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadHydration } from "../services/hydration";
import { deleteMeal, insertMeal, toMealResponse, updateMeal } from "../services/meals";
import { defaultFuelTargets, loadCurrentPlan } from "../services/plan-loaders";

export const fuelRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

fuelRoutes.get("/v1/fuel/today", requireAuth, async (c) => {
  const date = c.req.query("date") || todayUtc();
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const current = await loadCurrentPlan(db, userId);
  const targets = defaultFuelTargets(current.plan?.summary ?? null);
  const { start, end } = dayBoundsMs(date);
  // Day-bounded in SQL (uses meals_user_eaten_idx) — never scan the whole history.
  const rows = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        gte(meals.eatenAt, new Date(start)),
        lt(meals.eatenAt, new Date(end)),
      ),
    );
  const dayMeals = rows.map(toMealResponse);

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
    hydration: await loadHydration(db, userId, date),
  };
  return c.json(body);
});

/** Cal AI–style estimate from photo and/or description (does not save). */
fuelRoutes.post("/v1/meals/estimate", requireAuth, async (c) => {
  const body = parseBody(MealEstimateBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const estimator = getMealEstimator(c.env, db);
  const result = await estimator.estimate({
    userId,
    imageDataUrl: body.imageDataUrl,
    description: body.description,
  });
  const response: MealEstimateResponse = {
    name: sanitizeAiCopy(result.name) || result.name,
    kcal: Math.round(result.kcal),
    proteinG: result.proteinG,
    carbsG: result.carbsG,
    fatG: result.fatG,
    confidence: result.confidence,
    notes: result.notes ? sanitizeAiCopy(result.notes) : result.notes,
    source: result.source,
  };
  return c.json(response);
});

fuelRoutes.post("/v1/meals", requireAuth, async (c) => {
  const body = parseBody(MealBodySchema, await c.req.json());
  const db = createDb(c.env.DB);
  return c.json(await insertMeal(db, c.get("userId"), body), 201);
});

fuelRoutes.patch("/v1/meals/:id", requireAuth, async (c) => {
  const body = parseBody(MealPatchBodySchema, await c.req.json().catch(() => ({})));
  const db = createDb(c.env.DB);
  return c.json(await updateMeal(db, c.get("userId"), c.req.param("id"), body));
});

fuelRoutes.delete("/v1/meals/:id", requireAuth, async (c) => {
  const db = createDb(c.env.DB);
  await deleteMeal(db, c.get("userId"), c.req.param("id"));
  const response: MealDeleteResponse = { ok: true };
  return c.json(response);
});

/** Newest-first meal log history. `?limit=` (default 20, max 50) + opaque `?cursor=`. */
fuelRoutes.get("/v1/meals", requireAuth, async (c) => {
  const { limit, cursor } = parsePageQuery(c.req.query());
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        cursor ? olderThan(meals.eatenAt, meals.id, decodeCursor(cursor)) : undefined,
      ),
    )
    .orderBy(desc(meals.eatenAt), desc(meals.id))
    .limit(limit + 1);
  const page = toPage(rows, limit, (r) => r.eatenAt.getTime());
  const body: MealListResponse = { items: page.items.map(toMealResponse), nextCursor: page.nextCursor };
  return c.json(body);
});
