import type { CoachReviseResponse } from "@mirra/contracts";
import type { BatchItem } from "drizzle-orm/batch";

import { preferences } from "../../db/schema";
import { sanitizeAiCopy } from "../../lib/ai-copy";
import { ApiError, notFound } from "../../lib/errors";
import { recordRegen, type MealPlanCtx } from "../meal-plan-draft";
import { getTodayPlan } from "../meal-plan";
import { commitMealDraft } from "../meal-plan-targeted";
import { loadReviseState } from "./context";
import { claimDraft, loadDraft, setDraftStatus, touchHash, type StoredDraft } from "./drafts";
import { legacyChanges } from "./legacy";
import { assertReviseLimit, REVISE_ACTION } from "./limits";
import { assertScheduleFree, commitScheduleDraft } from "./schedule-step";
import { commitWorkoutDraft, isRowDraft } from "./workout-step";

const gone = (message: string) => new ApiError("draft_gone", message, 410);

const prefsUpsert = (ctx: MealPlanCtx, patch: Record<string, unknown>) => {
  const set = { ...patch, updatedAt: new Date() };
  return ctx.db
    .insert(preferences)
    .values({ userId: ctx.userId, primaryGoal: "consistency", experience: "new", ...set })
    .onConflictDoUpdate({ target: preferences.userId, set });
};

/**
 * Commit a stored draft exactly as previewed: no reviser / generator call. Prefs + meal
 * rows + workout rows + plan-day moves + audit go in one D1 batch (AMI-166).
 * 410 when applied/expired, 409 `plan_changed` on drift or a session logged on a moved day.
 */
export const applyDraft = async (ctx: MealPlanCtx, draftId: string): Promise<CoachReviseResponse> => {
  const draft: StoredDraft | null = await loadDraft(ctx, draftId);
  if (!draft) throw notFound("Plan change not found");
  if (draft.status === "applied") throw gone("That change is already applied");
  if (draft.status === "expired" || draft.expiresAt <= Date.now()) {
    if (draft.status === "pending") await setDraftStatus(ctx, draft.id, "expired");
    throw gone("That preview expired. Send it again");
  }

  // Only the apply cap: the meals were generated (and counted) when the draft was proposed.
  await assertReviseLimit(ctx);
  const hasMeals = (draft.meal?.ops.length ?? 0) > 0;

  const state = await loadReviseState(ctx, {
    message: "apply",
    date: draft.date,
    ...(draft.meta.context ? { context: draft.meta.context } : {}),
  });
  if (touchHash(state, draft.meta.touch) !== draft.baseHash) {
    await setDraftStatus(ctx, draft.id, "expired");
    throw new ApiError("plan_changed", "Your plan changed. Send that again?", 409);
  }
  if (draft.workout && !isRowDraft(draft.workout)) {
    await setDraftStatus(ctx, draft.id, "expired");
    throw gone("That preview expired. Send it again");
  }
  if (draft.schedule) {
    await assertScheduleFree(ctx, draft.schedule).catch(async (err: unknown) => {
      await setDraftStatus(ctx, draft.id, "expired");
      throw err;
    });
  }
  if (!(await claimDraft(ctx, draft.id))) throw gone("That change is already applied");

  const statements: BatchItem<"sqlite">[] = [];
  if (draft.prefsPatch && Object.keys(draft.prefsPatch).length > 0) statements.push(prefsUpsert(ctx, draft.prefsPatch));
  if (draft.meal && hasMeals) {
    statements.push(...commitMealDraft(ctx, draft.meal));
  }
  if (draft.workout) statements.push(...commitWorkoutDraft(ctx.db, draft.workout));
  if (draft.schedule) statements.push(...commitScheduleDraft(ctx.db, draft.schedule));
  try {
    await ctx.db.batch([recordRegen(ctx, REVISE_ACTION, draft.date), ...statements]);
  } catch (err) {
    await setDraftStatus(ctx, draft.id, "pending").catch(() => undefined);
    throw err;
  }

  const warnings = [...draft.meta.warnings];

  return {
    message: sanitizeAiCopy(draft.meta.reply),
    changes: legacyChanges(draft.items),
    items: draft.items,
    applied: true,
    source: draft.meta.source,
    mealPlan: draft.meal ? await getTodayPlan(ctx, draft.date) : undefined,
    workoutTitle: draft.meta.workoutTitle,
    intent: draft.meta.intent,
    draftId: draft.id,
    expiresAt: null,
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)].map(sanitizeAiCopy) } : {}),
  };
};
