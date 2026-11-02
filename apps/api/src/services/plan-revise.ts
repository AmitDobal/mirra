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
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { ApiError } from "../lib/errors";
import { parseJson } from "../lib/json";
import { getPlanReviser } from "../lib/plan-reviser";
import { hasMealIntent, hasWorkoutIntent, sanitizeIntent } from "../lib/plan-intent";
import type { PlanReviseResult } from "../ports/plan-reviser";
import { withAiCredits } from "./credits-gate";
import { recordRegen } from "./meal-plan-draft";
import { getTodayPlan, type MealPlanCtx } from "./meal-plan";
import { planMealPrefs, runMealRegen } from "./meal-revise";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";
import { reviseEquipment, sameList, snapSessionMinutes } from "./prefs-revise";
import { reviseWorkout } from "./workout-revise";

export const REVISE_ACTION = "coach.revise";
export const DAILY_REVISE_LIMIT = 4;

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

const fmtList = (list: readonly string[]): string => list.join(", ").replace(/_/g, " ") || "none";

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
  if (!dryRun) await assertReviseLimit(ctx);

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

  const existingPlan = await getTodayPlan(ctx, date);
  const targets = defaultFuelTargets(current.plan?.summary ?? null);

  // Confirm path: apply the exact previewed intent. No free-text re-parse, no LLM, no credits.
  const result: PlanReviseResult = body.intent
    ? { intent: sanitizeIntent(body.intent), reply: "Done. Your plan is updated.", warnings: [], source: "heuristic" }
    : await withAiCredits(
        ctx,
        {
          feature: "revise",
          paid: resolveAiProvider(ctx.env) === "openai",
          wasPaid: (r) => r.source === "openai",
        },
        () =>
          getPlanReviser(ctx.env, ctx.db).propose({
            userId: ctx.userId,
            message: body.message,
            scope,
            equipment,
            dietTags,
            foodsAvoid,
            cuisineStyles,
            workoutTitle: workout?.title ?? null,
            exerciseNames: workout?.exercises.map((e) => e.name) ?? [],
            mealsPerDay: prefs?.mealsPerDay ?? null,
            meals: (existingPlan?.meals ?? []).map((m) => ({
              slot: m.slot,
              title: m.title,
              kcal: m.kcal,
              status: m.status,
            })),
            nutrition: {
              goal: prefs?.primaryGoal ?? null,
              kcalTarget: targets.kcal,
              proteinGTarget: targets.proteinG,
              lifestyleNotes: prefs?.lifestyleNotes ?? null,
            },
            persona: toTrainerPersonaId(prefs?.trainerPersona),
          }),
      );
  const { intent } = result;
  const warnings = [...result.warnings];
  const changes: CoachReviseChange[] = [];

  const doMeal = scope !== "workout" && hasMealIntent(intent);
  const doWorkout = scope !== "meal" && hasWorkoutIntent(intent);
  if (scope === "meal" && hasWorkoutIntent(intent)) warnings.push("Ignored workout changes (scope is meal)");
  if (scope === "workout" && hasMealIntent(intent)) warnings.push("Ignored meal changes (scope is workout)");

  // --- Preferences (persisted unless dryRun) ---------------------------------
  const patch: Record<string, unknown> = {};

  const meal = doMeal
    ? planMealPrefs({ intent, prefs, dietTags, foodsAvoid, cuisineStyles, plan: existingPlan })
    : null;
  if (meal) {
    Object.assign(patch, meal.patch);
    changes.push(...meal.changes);
    warnings.push(...meal.warnings);
  }

  let nextEquipment = equipment;
  if (doWorkout) {
    nextEquipment = reviseEquipment(equipment, intent);
    if (!sameList(nextEquipment, equipment)) {
      patch.equipmentJson = JSON.stringify(nextEquipment);
      changes.push({
        kind: "equipment",
        area: "prefs",
        before: fmtList(equipment),
        after: fmtList(nextEquipment),
        summary: `Equipment: ${fmtList(nextEquipment)}`,
      });
    }
    if (intent.shortenMin != null) {
      const minutes = snapSessionMinutes(intent.shortenMin);
      if (minutes < (prefs?.sessionMinutes ?? 45)) {
        patch.sessionMinutes = minutes;
        changes.push({
          kind: "session_minutes",
          area: "prefs",
          before: `${prefs?.sessionMinutes ?? 45} min`,
          after: `${minutes} min`,
          summary: `Default session: ${minutes} min`,
        });
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
  let mealPlan: DayMealPlan | null = existingPlan;
  if (meal) {
    // "Fresh meals" asks only count when it is not just the meals-per-day request (that has its own target check).
    const wantsRegen =
      meal.foodsChanged || meal.mealsChanged || (intent.forceMealRegen && intent.mealsPerDay == null);
    const out = await runMealRegen(ctx, {
      body,
      date,
      dryRun,
      wantsRegen,
      swapAllowed: !meal.foodsChanged && !meal.mealsChanged,
      mealCount: meal.mealCount,
      kcalTarget: targets.kcal,
      existing: existingPlan,
    });
    mealPlan = out.mealPlan;
    changes.push(...out.changes);
    warnings.push(...out.warnings);
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
          area: "workout",
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
  if (applied) await recordRegen(ctx, REVISE_ACTION, date);
  const already = meal?.alreadyNotes ?? [];
  const noop = changes.length === 0 && warnings.length === 0;
  // Nothing to do: say so plainly instead of the reviser's "Done, now ..." line.
  const message = sanitizeAiCopy(
    changes.length === 0 && already.length > 0
      ? already.join(" ")
      : noop
        ? `${result.reply} Nothing in your plan needed changing.`
        : result.reply,
  );

  return {
    message: dryRun ? `Preview: ${message}` : message,
    changes: changes.map((ch) => ({ ...ch, summary: sanitizeAiCopy(ch.summary) })),
    applied,
    source: result.source ?? "heuristic",
    mealPlan: doMeal ? mealPlan : undefined,
    intent,
    workoutTitle: workout?.title ?? null,
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)].map(sanitizeAiCopy) } : {}),
  };
};
