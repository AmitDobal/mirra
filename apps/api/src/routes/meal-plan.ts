import {
  CreateMealPlanItemBodySchema,
  type DeleteMealPlanItemResponse,
  GenerateMealPlanBodySchema,
  type GetTodayMealPlanResponse,
  LogPlannedMealBodySchema,
  PatchMealPlanItemBodySchema,
  type LogPlannedMealResponse,
  RebalanceBodySchema,
  SwapBodySchema,
} from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { todayUtc } from "../lib/dates";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import {
  generatePlan,
  getTodayPlan,
  logPlannedMeal,
  type MealPlanCtx,
  rebalancePlan,
  swapPlannedMeal,
} from "../services/meal-plan";
import { createPlannedItem, deletePlannedItem, updatePlannedItem } from "../services/meal-plan-items";

export const mealPlanRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

type RouteCtx = { env: MirraEnv; get: (key: "userId") => string };
const ctxOf = (c: RouteCtx): MealPlanCtx => ({
  env: c.env,
  db: createDb(c.env.DB),
  userId: c.get("userId"),
});

/** Tolerate empty bodies on POST endpoints whose body is all-optional. */
const readJson = async (req: Request): Promise<unknown> => req.json().catch(() => ({}));

mealPlanRoutes.post("/v1/meal-plan/generate", requireAuth, async (c) => {
  const body = parseBody(GenerateMealPlanBodySchema, await readJson(c.req.raw));
  return c.json(await generatePlan(ctxOf(c), body));
});

mealPlanRoutes.get("/v1/meal-plan/today", requireAuth, async (c) => {
  const date = c.req.query("date") || todayUtc();
  const response: GetTodayMealPlanResponse = {
    plan: await getTodayPlan(ctxOf(c), date),
  };
  return c.json(response);
});

mealPlanRoutes.post("/v1/meal-plan/:id/log", requireAuth, async (c) => {
  const body = parseBody(LogPlannedMealBodySchema, await readJson(c.req.raw));
  const { plan, meal, created } = await logPlannedMeal(ctxOf(c), c.req.param("id"), body);
  const response: LogPlannedMealResponse = { plan, meal };
  return c.json(response, created ? 201 : 200);
});

mealPlanRoutes.post("/v1/meal-plan/:id/swap", requireAuth, async (c) => {
  const body = parseBody(SwapBodySchema, await readJson(c.req.raw));
  return c.json(await swapPlannedMeal(ctxOf(c), c.req.param("id"), body));
});

mealPlanRoutes.post("/v1/meal-plan/:id/rebalance", requireAuth, async (c) => {
  const body = parseBody(RebalanceBodySchema, await readJson(c.req.raw));
  return c.json(await rebalancePlan(ctxOf(c), c.req.param("id"), body));
});

// User-authored planned meals (no AI). `:itemId` is the planned meal id (`meals[].id`).
mealPlanRoutes.post("/v1/meal-plan/items", requireAuth, async (c) => {
  const body = parseBody(CreateMealPlanItemBodySchema, await c.req.json().catch(() => ({})));
  const { db, userId } = ctxOf(c);
  return c.json(await createPlannedItem(db, userId, body), 201);
});

mealPlanRoutes.patch("/v1/meal-plan/items/:itemId", requireAuth, async (c) => {
  const body = parseBody(PatchMealPlanItemBodySchema, await c.req.json().catch(() => ({})));
  const { db, userId } = ctxOf(c);
  return c.json(await updatePlannedItem(db, userId, c.req.param("itemId"), body));
});

mealPlanRoutes.delete("/v1/meal-plan/items/:itemId", requireAuth, async (c) => {
  const { db, userId } = ctxOf(c);
  const response: DeleteMealPlanItemResponse = {
    plan: await deletePlannedItem(db, userId, c.req.param("itemId")),
  };
  return c.json(response);
});
