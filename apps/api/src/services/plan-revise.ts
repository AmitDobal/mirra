import {
  toTrainerPersonaId,
  type CoachReviseBody,
  type CoachReviseChange,
  type CoachReviseResponse,
  type DayMealPlan,
} from "@mirra/contracts";
import { and, count, eq, gte } from "drizzle-orm";

import { auditLog, preferences } from "../db/schema";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { ApiError } from "../lib/errors";
import { parseJson } from "../lib/json";
import { filterCatalog } from "../lib/meal-diet";
import { getPlanReviser } from "../lib/plan-reviser";
import { hasMealIntent, hasWorkoutIntent } from "../lib/plan-intent";
import { recordRegen } from "./meal-plan-draft";
import { generatePlan, getTodayPlan, swapPlannedMeal, type MealPlanCtx } from "./meal-plan";
import { loadCurrentPlan } from "./plan-loaders";
import {
  reviseCuisines,
  reviseDietTags,
  reviseEquipment,
  reviseFoodsAvoid,
  sameList,
  snapSessionMinutes,
} from "./prefs-revise";
import { reviseWorkout } from "./workout-revise";

const REVISE_ACTION = "coach.revise";
const DAILY_REVISE_LIMIT = 40;

const assertReviseLimit = async (ctx: MealPlanCtx): Promise<void> => {
  const { start } = dayBoundsMs(todayUtc());
  const [row] = await ctx.db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, ctx.userId),
        eq(auditLog.action, REVISE_ACTION),
        gte(auditLog.createdAt, new Date(start)),
      ),
    );
  if ((row?.n ?? 0) >= DAILY_REVISE_LIMIT) {
    throw new ApiError("rate_limited", "Plan chat limit reached for today", 429);
  }
};

const asWarning = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Could not update meals right now";

/**
 * Plan chat: one message → structured intent (PlanReviser port) → edit the EXISTING
 * prefs, meal plan (regenerate via meal-plan service) and today's workout rows.
 */
export const revisePlans = async (
  ctx: MealPlanCtx,
  body: CoachReviseBody,
): Promise<CoachReviseResponse> => {
  const date = body.date ?? todayUtc();
  const dryRun = body.dryRun === true;
  const scope = body.scope ?? "auto";
  await assertReviseLimit(ctx);

  const [prefs] = await ctx.db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, ctx.userId))
    .limit(1);
  const equipment = parseJson<string[]>(prefs?.equipmentJson ?? "[]", []);
  const dietTags = parseJson<string[]>(prefs?.dietTagsJson ?? "[]", []);
  const foodsAvoid = prefs?.foodsAvoid ?? null;
  const cuisineStyles = parseJson<string[]>(prefs?.cuisineJson ?? "[]", []);

  const current = await loadCurrentPlan(ctx.db, ctx.userId);
  const dayWorkoutId = current.days.find((d) => d.date === date)?.workoutId ?? null;
  const requestedId = body.context?.workoutId;
  const requested = requestedId ? current.workouts.find((w) => w.id === requestedId) : undefined;
  // Rest day: revise the next upcoming lift so equipment chat still edits a real session.
  const nextLiftId =
    current.days.find((d) => d.date >= date && d.workoutId)?.workoutId ??
    current.days.find((d) => d.workoutId)?.workoutId ??
    null;
  const workout =
    requested ??
    current.workouts.find((w) => w.id === dayWorkoutId) ??
    current.workouts.find((w) => w.id === nextLiftId) ??
    null;
  const workoutIsNextLift = Boolean(workout && !requested && !dayWorkoutId && nextLiftId);

  const result = await getPlanReviser(ctx.env, ctx.db).propose({
    userId: ctx.userId,
    message: body.message,
    scope,
    equipment,
    dietTags,
    foodsAvoid,
    cuisineStyles,
    workoutTitle: workout?.title ?? null,
    exerciseNames: workout?.exercises.map((e) => e.name) ?? [],
    persona: toTrainerPersonaId(prefs?.trainerPersona),
  });
  const { intent } = result;
  const warnings = [...result.warnings];
  const changes: CoachReviseChange[] = [];

  const doMeal = scope !== "workout" && hasMealIntent(intent);
  const doWorkout = scope !== "meal" && hasWorkoutIntent(intent);
  if (scope === "meal" && hasWorkoutIntent(intent)) warnings.push("Ignored workout changes (scope is meal)");
  if (scope === "workout" && hasMealIntent(intent)) warnings.push("Ignored meal changes (scope is workout)");

  // --- Preferences (persisted unless dryRun) ---------------------------------
  const patch: Record<string, unknown> = {};
  let foodsChanged = false;

  if (doMeal) {
    const nextDiet = reviseDietTags(dietTags, intent.dietTagsAdd);
    const nextAvoid = reviseFoodsAvoid(foodsAvoid, intent.foodsAvoidAdd);
    const nextCuisines = reviseCuisines(cuisineStyles, intent.cuisineStylesAdd, intent.cuisineStylesOnly);
    if (filterCatalog(nextDiet, nextAvoid, nextCuisines, prefs?.lifestyleNotes).length === 0) {
      warnings.push("Those food limits leave nothing to eat; meal prefs unchanged");
    } else if (
      !sameList(nextDiet, dietTags) ||
      nextAvoid !== foodsAvoid ||
      !sameList(nextCuisines, cuisineStyles)
    ) {
      foodsChanged = true;
      patch.dietTagsJson = JSON.stringify(nextDiet);
      patch.foodsAvoid = nextAvoid;
      patch.cuisineJson = JSON.stringify(nextCuisines);
      if (!sameList(nextCuisines, cuisineStyles)) {
        changes.push({ kind: "cuisine_styles", summary: `Cuisines: ${nextCuisines.join(", ").replace(/_/g, " ")}` });
      }
      if (!sameList(nextDiet, dietTags)) {
        changes.push({ kind: "diet_tags", summary: `Diet: ${nextDiet.join(", ").replace(/_/g, " ")}` });
      }
      if (nextAvoid !== foodsAvoid) changes.push({ kind: "foods_avoid", summary: `Avoiding: ${nextAvoid ?? "nothing"}` });
    }
  }

  let nextEquipment = equipment;
  if (doWorkout) {
    nextEquipment = reviseEquipment(equipment, intent);
    if (!sameList(nextEquipment, equipment)) {
      patch.equipmentJson = JSON.stringify(nextEquipment);
      changes.push({ kind: "equipment", summary: `Equipment: ${nextEquipment.join(", ").replace(/_/g, " ") || "none"}` });
    }
    if (intent.shortenMin != null) {
      const minutes = snapSessionMinutes(intent.shortenMin);
      if (minutes < (prefs?.sessionMinutes ?? 45)) {
        patch.sessionMinutes = minutes;
        changes.push({ kind: "session_minutes", summary: `Default session: ${minutes} min` });
      }
    }
  }

  if (!dryRun && Object.keys(patch).length > 0) {
    const set = { ...patch, updatedAt: new Date() };
    await ctx.db
      .insert(preferences)
      .values({ userId: ctx.userId, primaryGoal: "consistency", experience: "new", ...set })
      .onConflictDoUpdate({ target: preferences.userId, set });
  }

  // --- Meals -----------------------------------------------------------------
  let mealPlan: DayMealPlan | null = null;
  if (doMeal) {
    const wantsRegen = foodsChanged || intent.forceMealRegen;
    try {
      if (wantsRegen && !dryRun) {
        const existing = await getTodayPlan(ctx, date);
        const itemId = body.context?.mealItemId;
        const swapOne = !foodsChanged && itemId && existing;
        mealPlan = swapOne
          ? await swapPlannedMeal(ctx, existing.id, { mealItemId: itemId })
          : await generatePlan(ctx, { date, force: true });
        changes.push({
          kind: "meal_regen",
          summary: swapOne ? "Swapped that meal" : `Rebuilt ${date === todayUtc() ? "today's" : date} meals`,
        });
      } else {
        mealPlan = await getTodayPlan(ctx, date);
        if (wantsRegen) changes.push({ kind: "meal_regen", summary: "Meals would be rebuilt" });
      }
    } catch (err) {
      warnings.push(asWarning(err));
      mealPlan = await getTodayPlan(ctx, date).catch(() => null);
    }
  }

  // --- Workout ---------------------------------------------------------------
  if (doWorkout) {
    const out = workout
      ? await reviseWorkout(ctx.db, {
          workoutId: workout.id,
          equipment: nextEquipment,
          intent,
          exerciseId: body.context?.exerciseId,
          dryRun,
        })
      : null;
    if (out) {
      if (workoutIsNextLift) {
        changes.push({
          kind: "workout_target",
          summary: `Today is rest — updated next lift (${workout!.title})`,
        });
      }
      changes.push(...out.changes);
      warnings.push(...out.warnings);
    } else {
      warnings.push(`No lift days left this week; equipment saved for future plans`);
    }
  }

  const applied = !dryRun && changes.length > 0;
  await recordRegen(ctx, REVISE_ACTION, date); // metered even for dryRun (the reviser may call AI)
  const noop = changes.length === 0 && warnings.length === 0;
  const message = sanitizeAiCopy(
    noop ? `${result.reply} Nothing in your plan needed changing.` : result.reply,
  );

  return {
    message: dryRun ? `Preview: ${message}` : message,
    changes: changes.map((ch) => ({ ...ch, summary: sanitizeAiCopy(ch.summary) })),
    applied,
    source: result.source ?? "heuristic",
    mealPlan: doMeal ? mealPlan : undefined,
    workoutTitle: workout?.title ?? null,
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)].map(sanitizeAiCopy) } : {}),
  };
};
