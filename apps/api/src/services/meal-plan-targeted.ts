import type { Macros, MealSlot } from "@mirra/contracts";
import { and, eq, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { CatalogRow } from "../data/vetted-foods";
import type { DietConstraints } from "../lib/diet-constraints";
import { mealPlanDays, mealPlanItems } from "../db/schema";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { newId } from "../lib/id";
import { SLOT_ORDER } from "../lib/meal-macros";
import { withAiCredits } from "./credits-gate";
import { type Drafted, materializeDrafts, type MealPlanCtx } from "./meal-plan-draft";
import { recentFoodIds } from "./meal-plan-store";

/**
 * Targeted meal drafting for plan chat (AMI-163, arch §8.2): `draftMeals` builds real
 * dishes in memory (MealPlanGenerator port, no writes); `commitMealDraft` turns the
 * stored draft into D1 batch statements (no AI call on apply).
 */

/** Persisted meal_plan_items columns of one drafted dish. */
export type MealItemValues = {
  title: string;
  itemsJson: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fit: "ok" | "approx";
};

export type MealOp =
  | { op: "replace"; itemId: string; slot: MealSlot; values: MealItemValues }
  | { op: "insert"; slot: MealSlot; values: MealItemValues }
  | { op: "delete"; itemId: string; slot: MealSlot };

export type MealDraft = {
  date: string;
  dayId: string;
  /** Set when the day has no meal plan yet: apply creates it. */
  createDay: { planId: string | null; targetsJson: string } | null;
  source: "openai" | "heuristic";
  wholeDay: boolean;
  ops: MealOp[];
};

export type DraftMealsArgs = {
  date: string;
  slots: MealSlot[];
  /** Macros to split across `slots` (one slot: that slot's budget). */
  budget: Macros;
  targets: Macros;
  /** Already filtered by the post-revision diet / avoid / cuisine prefs. */
  catalog: CatalogRow[];
  /** AMI-199: resolved bans for the same (post-revision) prefs as `catalog`. */
  diet: DietConstraints;
  avoidFoodIds: string[];
  seed: string;
  /** Whole-day asks use the configured generator (AI, credits); slot swaps stay heuristic. */
  useAi: boolean;
};

export const toItemValues = (d: Drafted): MealItemValues => ({
  title: d.title,
  itemsJson: JSON.stringify(d.meal.items),
  kcal: d.meal.totals.kcal,
  proteinG: d.meal.totals.proteinG,
  carbsG: d.meal.totals.carbsG,
  fatG: d.meal.totals.fatG,
  fit: d.meal.fit,
});

/** Draft real dishes for `slots` without writing anything. */
export const draftMeals = async (
  ctx: MealPlanCtx,
  a: DraftMealsArgs,
): Promise<{ meals: Map<MealSlot, Drafted>; source: "openai" | "heuristic" }> => {
  if (a.slots.length === 0) return { meals: new Map(), source: "heuristic" };
  const input = {
    userId: ctx.userId,
    date: a.date,
    targets: a.targets,
    remaining: a.budget,
    slots: a.slots,
    catalog: a.catalog,
    diet: a.diet,
    avoidFoodIds: a.avoidFoodIds,
    recentFoodIds: await recentFoodIds(ctx.db, ctx.userId, a.date),
    seed: a.seed,
  };
  if (!a.useAi) return materializeDrafts(input);
  return withAiCredits(
    ctx,
    {
      feature: "meal_plan",
      paid: resolveAiProvider(ctx.env) === "openai",
      wasPaid: (r) => r.source === "openai",
    },
    () => materializeDrafts(input, ctx),
  );
};

/** D1 statements that commit a stored meal draft exactly as previewed. */
export const commitMealDraft = (ctx: MealPlanCtx, draft: MealDraft): BatchItem<"sqlite">[] => {
  const now = new Date();
  const out: BatchItem<"sqlite">[] = [];
  if (draft.createDay) {
    out.push(
      ctx.db.insert(mealPlanDays).values({
        id: draft.dayId,
        userId: ctx.userId,
        localDate: draft.date,
        planId: draft.createDay.planId,
        source: draft.source,
        targetsJson: draft.createDay.targetsJson,
        rebalancedAt: null,
        createdAt: now,
      }),
    );
  } else if (draft.wholeDay) {
    out.push(
      ctx.db
        .update(mealPlanDays)
        .set({ source: draft.source, rebalancedAt: null })
        .where(and(eq(mealPlanDays.id, draft.dayId), eq(mealPlanDays.userId, ctx.userId))),
    );
  }
  for (const op of draft.ops) {
    if (op.op === "replace") {
      out.push(
        ctx.db
          .update(mealPlanItems)
          .set({ ...op.values, status: "planned", updatedAt: now })
          .where(
            and(
              eq(mealPlanItems.id, op.itemId),
              eq(mealPlanItems.dayId, draft.dayId),
              ne(mealPlanItems.status, "logged"),
            ),
          ),
      );
    } else if (op.op === "insert") {
      out.push(
        ctx.db.insert(mealPlanItems).values({
          id: newId(),
          dayId: draft.dayId,
          slot: op.slot,
          position: SLOT_ORDER.indexOf(op.slot),
          status: "planned",
          loggedMealId: null,
          ...op.values,
          updatedAt: now,
        }),
      );
    } else {
      out.push(
        ctx.db
          .delete(mealPlanItems)
          .where(
            and(
              eq(mealPlanItems.id, op.itemId),
              eq(mealPlanItems.dayId, draft.dayId),
              ne(mealPlanItems.status, "logged"),
            ),
          ),
      );
    }
  }
  return out;
};
