import { getCurrentPlan, type CurrentPlan, type PlanExercise } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { findPlanExercise } from "./exercise-muscles";

/** Re-read the API plan at most once a minute (detail + HUD both ask). */
const TTL_MS = 60_000;
let cached: { at: number; req: Promise<CurrentPlan | null> } | null = null;

const currentPlan = (): Promise<CurrentPlan | null> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.req;
  const req = getCurrentPlan().catch((err: unknown) => {
    logger.warn("exercise.plan_meta.failed", { message: errorMessage(err) });
    cached = null;
    return null;
  });
  cached = { at: Date.now(), req };
  return req;
};

export type PlanExerciseMeta = Pick<PlanExercise, "canonicalId" | "muscles">;

/**
 * `canonicalId` + `muscles` for a plan lift (AMI-161). Uses the row itself when
 * it already carries them, else the API plan (the SQLite mirror drops them).
 */
export const loadPlanExerciseMeta = async (ex: PlanExercise): Promise<PlanExerciseMeta | null> => {
  if (ex.canonicalId || ex.muscles?.length) return { canonicalId: ex.canonicalId, muscles: ex.muscles };
  const hit = findPlanExercise(await currentPlan(), ex.id, ex.name);
  return hit ? { canonicalId: hit.canonicalId ?? null, muscles: hit.muscles ?? [] } : null;
};
