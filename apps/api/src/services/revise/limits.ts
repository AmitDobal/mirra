import { and, count, eq, gte } from "drizzle-orm";

import { auditLog } from "../../db/schema";
import { dayBoundsMs, todayUtc } from "../../lib/dates";
import { ApiError } from "../../lib/errors";
import type { MealPlanCtx } from "../meal-plan-draft";

/** Applied plan-chat edits (AMI-159 cap, unchanged). */
export const REVISE_ACTION = "coach.revise";
export const DAILY_REVISE_LIMIT = 4;
/** Proposals (each one drafts real meals). */
export const PROPOSE_ACTION = "coach.revise.propose";
export const DAILY_PROPOSE_LIMIT = 6;
/**
 * Whole-day AI meal redrafts from chat (AMI-170): 2/day, counted at propose. Single-slot
 * and avoid swaps use the heuristic generator (no AI call) and never count; the plan's
 * own `meal_plan.generate` never eats this budget either.
 */
export const MEAL_DAY_ACTION = "coach.revise.meal_day";
export const DAILY_MEAL_DAY_LIMIT = 2;
export const MEAL_CAP_WARNING = "You've used today's full-day meal rebuilds, so meals stay as they are. Try again tomorrow";

const countToday = async (ctx: MealPlanCtx, action: string): Promise<number> => {
  const { start } = dayBoundsMs(todayUtc());
  const [row] = await ctx.db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(eq(auditLog.userId, ctx.userId), eq(auditLog.action, action), gte(auditLog.createdAt, new Date(start))),
    );
  return row?.n ?? 0;
};

export const assertReviseLimit = async (ctx: MealPlanCtx): Promise<void> => {
  if ((await countToday(ctx, REVISE_ACTION)) >= DAILY_REVISE_LIMIT) {
    throw new ApiError("rate_limited", "Plan chat limit reached for today", 429);
  }
};

export const mealDayQuotaOk = async (ctx: MealPlanCtx): Promise<boolean> =>
  (await countToday(ctx, MEAL_DAY_ACTION)) < DAILY_MEAL_DAY_LIMIT;

export const assertProposeLimit = async (ctx: MealPlanCtx): Promise<void> => {
  if ((await countToday(ctx, PROPOSE_ACTION)) >= DAILY_PROPOSE_LIMIT) {
    throw new ApiError("rate_limited", "Plan chat limit reached for today", 429);
  }
};
