import type { CoachReviseBody, CoachReviseResponse, ReviseItem } from "@mirra/contracts";

import { sanitizeAiCopy } from "../../lib/ai-copy";
import { resolveAiProvider } from "../../lib/ai/resolve-provider";
import { todayUtc } from "../../lib/dates";
import { ApiError } from "../../lib/errors";
import { getPlanReviser } from "../../lib/plan-reviser";
import { hasMealIntent, hasWorkoutIntent, sanitizeIntent } from "../../lib/plan-intent";
import type { PlanReviseResult } from "../../ports/plan-reviser";
import { withAiCredits } from "../credits-gate";
import { recordRegen, type MealPlanCtx } from "../meal-plan-draft";
import type { MealDraft } from "../meal-plan-targeted";
import { applyDraft } from "./apply";
import { loadReviseState, reviserInput, type ReviseState } from "./context";
import { createDraft, findPendingForIntent, intentKeyOf, touchHash, type DraftTouch } from "./drafts";
import { legacyChanges } from "./legacy";
import { assertProposeLimit, assertReviseLimit, PROPOSE_ACTION } from "./limits";
import { mealStep, type MealStepResult } from "./meal-step";
import { prefsStep } from "./prefs-step";
import { workoutStep, type WorkoutDraft } from "./workout-step";

type Proposal = {
  items: ReviseItem[];
  warnings: string[];
  alreadyNotes: string[];
  patch: Record<string, unknown>;
  meal: MealDraft | null;
  workout: WorkoutDraft | null;
  touch: DraftTouch;
  doMeal: boolean;
};

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
  const meal = mealPrefs
    ? await safeMealStep(() => mealStep(ctx, { state, intent, prefs: mealPrefs, mealItemId: body.context?.mealItemId }))
    : null;
  const workout = doWorkout
    ? await workoutStep(ctx.db, state, intent, prefs.nextEquipment, body.context?.exerciseId)
    : null;
  warnings.push(...(meal?.warnings ?? []), ...(workout?.warnings ?? []));

  const workoutItems = [...(workout?.items ?? [])];
  if (prefs.sessionDefault && !workoutItems.some((i) => i.kind === "session_minutes")) {
    workoutItems.push({ id: "session_minutes", kind: "session_minutes", ...prefs.sessionDefault, droppedExercises: [], tags: [], reason: null });
  }
  if (state.workoutIsNextLift && (workout?.items.length ?? 0) > 0) {
    warnings.push(`Today is a rest day, so this edits your next lift (${state.dayLabel})`);
  }
  const items = [
    ...workoutItems,
    ...prefs.items.filter((i) => i.kind === "meals_per_day"),
    ...(meal?.items ?? []),
    ...prefs.items.filter((i) => i.kind === "pref"),
  ];
  const wholeDay = meal?.draft?.wholeDay ?? false;
  return {
    items,
    warnings,
    alreadyNotes: prefs.alreadyNotes,
    patch: prefs.patch,
    meal: meal?.draft ?? null,
    workout: workout?.draft ?? null,
    touch: {
      mealDay: wholeDay,
      mealItemIds: meal?.draft && !wholeDay ? meal.touchedIds : [],
      workoutId: workout?.draft?.workoutId ?? null,
      prefs: Object.keys(prefs.patch).length > 0,
    },
    doMeal,
  };
};

const replyFor = (reply: string, p: Proposal): string => {
  if (p.items.length === 0 && p.alreadyNotes.length > 0) return p.alreadyNotes.join(" ");
  if (p.items.length === 0 && p.warnings.length === 0) return `${reply} Nothing in your plan needed changing.`;
  return reply;
};

/**
 * Plan chat (arch §8): message -> intent (PlanReviser port) -> full edit drafted in memory
 * -> stored draft with real before/after rows. `dryRun` returns the preview + `draftId`;
 * POST /v1/coach/revise/apply commits it. Legacy v1 confirm (`intent` echo) applies the
 * matching pending draft, else drafts and commits in one go.
 */
export const revisePlans = async (ctx: MealPlanCtx, body: CoachReviseBody): Promise<CoachReviseResponse> => {
  const dryRun = body.dryRun === true;
  const date = body.date ?? todayUtc();
  const echoed = body.intent ? sanitizeIntent(body.intent) : null;
  if (!dryRun && echoed) {
    const pending = await findPendingForIntent(ctx, date, intentKeyOf(echoed));
    if (pending) return applyDraft(ctx, pending.id);
  }
  if (dryRun) await assertProposeLimit(ctx);
  else await assertReviseLimit(ctx);

  const state = await loadReviseState(ctx, body);
  const result: PlanReviseResult = echoed
    ? { intent: echoed, reply: "Done. Your plan is updated.", warnings: [], source: "heuristic" }
    : await withAiCredits(
        ctx,
        { feature: "revise", paid: resolveAiProvider(ctx.env) === "openai", wasPaid: (r) => r.source === "openai" },
        () => getPlanReviser(ctx.env, ctx.db).propose(reviserInput(ctx, state, body)),
      );
  const p = await buildProposal(ctx, state, body, result);
  if (dryRun) await recordRegen(ctx, PROPOSE_ACTION, date);

  const message = sanitizeAiCopy(replyFor(result.reply, p));
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
    workoutTitle: state.workout?.title ?? null,
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
      reply: dryRun ? "Done. Your plan is updated." : message,
      source,
      warnings,
      workoutTitle: state.workout?.title ?? null,
      context: body.context ?? null,
      touch: p.touch,
    },
    items: p.items,
    prefsPatch: Object.keys(p.patch).length > 0 ? p.patch : null,
    meal: p.meal,
    workout: p.workout,
    baseHash: touchHash(state, p.touch),
  });
  if (!dryRun) return applyDraft(ctx, draft.id);
  return { ...base, draftId: draft.id, expiresAt: draft.expiresAt };
};
