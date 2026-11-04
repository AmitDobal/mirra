import type { CoachReviseBody, CoachReviseResponse, ReviseItem } from "@mirra/contracts";

import { sanitizeAiCopy } from "../../lib/ai-copy";
import { resolveAiProvider } from "../../lib/ai/resolve-provider";
import { todayUtc } from "../../lib/dates";
import { ApiError } from "../../lib/errors";
import { getPlanReviser } from "../../lib/plan-reviser";
import { hasAnyIntent, hasMealIntent, hasWorkoutIntent, sanitizeIntent } from "../../lib/plan-intent";
import type { PlanReviseResult } from "../../ports/plan-reviser";
import { withAiCredits } from "../credits-gate";
import { recordRegen, type MealPlanCtx } from "../meal-plan-draft";
import type { MealDraft } from "../meal-plan-targeted";
import { applyDraft } from "./apply";
import { loadReviseState, reviserInput, type ReviseState } from "./context";
import { createDraft, findPendingForIntent, intentKeyOf, touchHash, type DraftTouch } from "./drafts";
import { legacyChanges } from "./legacy";
import { assertProposeLimit, assertReviseLimit, MEAL_DAY_ACTION, mealDayQuotaOk, PROPOSE_ACTION } from "./limits";
import { mealStep, type MealStepResult } from "./meal-step";
import { prefsStep } from "./prefs-step";
import { scheduleStep, type ScheduleDraft } from "./schedule-step";
import { workoutStep, type WorkoutDraft } from "./workout-step";

type Proposal = {
  items: ReviseItem[];
  warnings: string[];
  alreadyNotes: string[];
  patch: Record<string, unknown>;
  meal: MealDraft | null;
  workout: WorkoutDraft | null;
  schedule: ScheduleDraft | null;
  touch: DraftTouch;
  doMeal: boolean;
  /** Title of the workout the edit lands on (not always today's). */
  workoutTitle: string | null;
};

/** S39 coach line for a preview: nothing is applied yet, so never "Done". */
export const PREVIEW_REPLY = "Here is the change. Nothing updates until you apply.";
export const APPLIED_REPLY = "Done. Your plan is updated.";


/** Meal drafting problems become warnings; credit/paywall errors still reach the client. */
const safeMealStep = async (run: () => Promise<MealStepResult>): Promise<MealStepResult> => {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError && !err.code.startsWith("ai_")) {
      return { items: [], draft: null, warnings: [err.message], touchedIds: [] };
    }
    throw err;
  }
};

/** Run every step in memory (dry): typed items + the exact rows apply will commit. */
const buildProposal = async (
  ctx: MealPlanCtx,
  state: ReviseState,
  body: CoachReviseBody,
  result: PlanReviseResult,
): Promise<Proposal> => {
  const { intent } = result;
  const scope = body.scope ?? "auto";
  const warnings = [...result.warnings];
  const doMeal = scope !== "workout" && hasMealIntent(intent);
  const doWorkout = scope !== "meal" && hasWorkoutIntent(intent);
  if (scope === "meal" && hasWorkoutIntent(intent)) warnings.push("Ignored workout changes (scope is meal)");
  if (scope === "workout" && hasMealIntent(intent)) warnings.push("Ignored meal changes (scope is workout)");

  const prefs = prefsStep(state, intent, { doMeal, doWorkout });
  warnings.push(...prefs.warnings);
  const mealPrefs = prefs.meal;
  const allowWholeDay = mealPrefs ? await mealDayQuotaOk(ctx) : true;
  const meal = mealPrefs
    ? await safeMealStep(() => mealStep(ctx, { state, intent, prefs: mealPrefs, mealItemId: body.context?.mealItemId, allowWholeDay }))
    : null;
  const workout = doWorkout
    ? workoutStep(state, intent, prefs.nextEquipment, {
        message: body.message,
        ...(body.context?.exerciseId ? { exerciseId: body.context.exerciseId } : {}),
        ...(body.context?.workoutId ? { contextWorkoutId: body.context.workoutId } : {}),
      })
    : null;
  const schedule = doWorkout ? await scheduleStep(ctx, state, intent) : null;
  warnings.push(...(meal?.warnings ?? []), ...(workout?.warnings ?? []), ...(schedule?.warnings ?? []));

  const workoutItems = [...(workout?.items ?? [])];
  if (prefs.sessionDefault && !workoutItems.some((i) => i.kind === "session_minutes")) {
    workoutItems.push({ id: "session_minutes", kind: "session_minutes", ...prefs.sessionDefault, droppedExercises: [], tags: [], reason: null });
  }
  if (state.workoutIsNextLift && workout?.draft?.workoutId === state.workout?.id && (workout?.items.length ?? 0) > 0) {
    warnings.push(`Today is a rest day, so this edits your next lift (${state.dayLabel})`);
  }
  const items = [
    ...workoutItems,
    ...(schedule?.items ?? []),
    ...prefs.items.filter((i) => i.kind === "meals_per_day"),
    ...(meal?.items ?? []),
    ...prefs.items.filter((i) => i.kind === "pref"),
  ];
  const wholeDay = meal?.draft?.wholeDay ?? false;
  const editedId = workout?.draft?.workoutId ?? schedule?.items.flatMap((i) => (i.kind === "schedule_day_move" ? [i.workoutId] : []))[0];
  const edited = state.plan.workouts.find((w) => w.id === editedId) ?? state.workout;
  return {
    items,
    warnings,
    alreadyNotes: prefs.alreadyNotes,
    patch: prefs.patch,
    meal: meal?.draft ?? null,
    workout: workout?.draft ?? null,
    schedule: schedule?.draft ?? null,
    touch: {
      mealDay: wholeDay,
      mealItemIds: meal?.draft && !wholeDay ? meal.touchedIds : [],
      workoutId: workout?.draft?.workoutId ?? null,
      prefs: Object.keys(prefs.patch).length > 0,
      ...(schedule?.dayIds.length ? { dayIds: schedule.dayIds } : {}),
    },
    doMeal,
    workoutTitle: edited?.title ?? null,
  };
};

/**
 * Coach line. A preview with rows says only what S39 says (nothing is applied yet); the
 * reviser's own reply is kept for direct applies and for "couldn't map" help. A turn that
 * changed nothing never claims it did.
 */
const replyFor = (result: PlanReviseResult, p: Proposal, dryRun: boolean): string => {
  if (p.items.length > 0) return dryRun ? PREVIEW_REPLY : result.reply;
  if (p.alreadyNotes.length > 0) return p.alreadyNotes.join(" ");
  if (!hasAnyIntent(result.intent)) return result.reply;
  if (p.warnings.length > 0) return "I couldn't change that yet. See the note below.";
  return "Nothing in your plan needed changing.";
};

/** Stale-draft errors a v2 client handles; old installed builds never see them (AMI-171). */
const LEGACY_FALLBACK_CODES = new Set(["plan_changed", "draft_gone", "not_found"]);

/**
 * Legacy v1 confirm (no draftId): commit the matching pending draft. When it is stale or
 * already gone, return null so the caller re-runs the revise and applies fresh (pre-v2
 * behaviour) instead of surfacing 409/410 to a build that cannot handle them.
 */
const applyLegacyPending = async (
  ctx: MealPlanCtx,
  date: string,
  echoed: PlanReviseResult["intent"],
): Promise<CoachReviseResponse | null> => {
  const pending = await findPendingForIntent(ctx, date, intentKeyOf(echoed));
  if (!pending) return null;
  try {
    return await applyDraft(ctx, pending.id);
  } catch (err) {
    // applyDraft already marked a drifted draft expired; never touch an applied one here.
    if (err instanceof ApiError && LEGACY_FALLBACK_CODES.has(err.code)) return null;
    throw err;
  }
};

/**
 * Plan chat (arch §8): message -> intent (PlanReviser port) -> full edit drafted in memory
 * -> stored draft with real before/after rows. `dryRun` returns the preview + `draftId`;
 * POST /v1/coach/revise/apply commits it. Legacy v1 confirm (`intent` echo) applies the
 * matching pending draft; when none is live (or it went stale) it drafts and commits in one go.
 */
export const revisePlans = async (ctx: MealPlanCtx, body: CoachReviseBody): Promise<CoachReviseResponse> => {
  const dryRun = body.dryRun === true;
  const date = body.date ?? todayUtc();
  const echoed = body.intent ? sanitizeIntent(body.intent) : null;
  if (!dryRun && echoed) {
    const applied = await applyLegacyPending(ctx, date, echoed);
    if (applied) return applied;
  }
  if (dryRun) await assertProposeLimit(ctx);
  else await assertReviseLimit(ctx);

  const state = await loadReviseState(ctx, body);
  const result: PlanReviseResult = echoed
    ? { intent: echoed, reply: APPLIED_REPLY, warnings: [], source: "heuristic" }
    : await withAiCredits(
        ctx,
        { feature: "revise", paid: resolveAiProvider(ctx.env) === "openai", wasPaid: (r) => r.source === "openai" },
        () => getPlanReviser(ctx.env, ctx.db).propose(reviserInput(ctx, state, body)),
      );
  const p = await buildProposal(ctx, state, body, result);
  if (dryRun) await recordRegen(ctx, PROPOSE_ACTION, date);
  // Only a whole-day AI redraft spends the chat meal budget, and only now (never on apply).
  if (p.meal?.wholeDay && p.meal.ops.length > 0) await recordRegen(ctx, MEAL_DAY_ACTION, date);

  const message = sanitizeAiCopy(replyFor(result, p, dryRun));
  const source = result.source ?? "heuristic";
  const warnings = [...new Set(p.warnings)].map(sanitizeAiCopy);
  const base: CoachReviseResponse = {
    message: dryRun ? `Preview: ${message}` : message,
    changes: legacyChanges(p.items),
    items: p.items,
    applied: false,
    source,
    mealPlan: p.doMeal ? state.mealPlan : undefined,
    intent: result.intent,
    workoutTitle: p.workoutTitle,
    draftId: null,
    expiresAt: null,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
  if (p.items.length === 0 && Object.keys(p.patch).length === 0) return base;

  const draft = await createDraft(ctx, {
    date,
    meta: {
      intent: result.intent,
      intentKey: intentKeyOf(result.intent),
      reply: dryRun ? APPLIED_REPLY : message,
      source,
      warnings,
      workoutTitle: p.workoutTitle,
      context: body.context ?? null,
      touch: p.touch,
    },
    items: p.items,
    prefsPatch: Object.keys(p.patch).length > 0 ? p.patch : null,
    meal: p.meal,
    workout: p.workout,
    schedule: p.schedule,
    baseHash: touchHash(state, p.touch),
  });
  if (!dryRun) return applyDraft(ctx, draft.id);
  return { ...base, draftId: draft.id, expiresAt: draft.expiresAt };
};
