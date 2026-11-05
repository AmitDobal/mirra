/**
 * `GoalContext` for AI ports (arch §6). Built from the active plan + today's projection;
 * no AI call, no writes. AMI-181 wires it into envelopes and prompts.
 */
import { GoalContextSchema, type GoalContext } from "@mirra/contracts";

import type { AppDB } from "../db";
import { goalLine, toGoalContext } from "../lib/goal";
import { loadGoalBase } from "./goal-load";
import { computeGoal } from "./goal-refresh";

/** Null when the user has no active goal plan (not onboarded, or before first `GET /v1/goal`). */
export const buildGoalContext = async (
  db: AppDB,
  userId: string,
  now: Date = new Date(),
): Promise<GoalContext | null> => {
  const base = await loadGoalBase(db, userId);
  if (!base.plan) return null;
  const c = await computeGoal(db, userId, base, base.plan, now);
  return GoalContextSchema.parse(toGoalContext(base.plan, c.projection, c.today));
};

/** Same, but a failure (or a context over budget) yields null so the AI call still runs. */
export const buildGoalContextSafe = async (
  db: AppDB,
  userId: string,
  now: Date = new Date(),
): Promise<GoalContext | null> => {
  try {
    return await buildGoalContext(db, userId, now);
  } catch (err) {
    console.warn(`[goal] context failed for ${userId}:`, err instanceof Error ? err.message : err);
    return null;
  }
};

const perRequest = new WeakMap<object, Promise<GoalContext | null>>();

/**
 * `buildGoalContextSafe` once per request context object (meal plan drafts call the generator
 * more than once per request). Never throws.
 */
export const goalContextFor = (ctx: { db: AppDB; userId: string }): Promise<GoalContext | null> => {
  let p = perRequest.get(ctx);
  if (!p) {
    p = buildGoalContextSafe(ctx.db, ctx.userId);
    perRequest.set(ctx, p);
  }
  return p;
};

export { goalLine };
