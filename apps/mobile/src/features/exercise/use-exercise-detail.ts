import { useEffect, useMemo, useState } from "react";

import type { PlanExercise } from "@/lib/api";
import { getExerciseStrength, type ExerciseStrength } from "@/lib/api/strength-exercise";
import { errorMessage, logger } from "@/lib/logger";

import type { CatalogEntry } from "./catalog";
import { resolveMuscles, type ResolvedMuscles } from "./exercise-muscles";
import { loadPlanExerciseMeta, type PlanExerciseMeta } from "./plan-meta";

export type StrengthState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: ExerciseStrength }
  /** No canonical id (unresolved lift) or the request failed: show the unranked card. */
  | { readonly status: "none" };

export type ExerciseDetailData = {
  readonly canonicalId: string | null;
  readonly muscles: ResolvedMuscles;
  readonly strength: StrengthState;
};

/** S36 data: plan meta → canonical id → `GET /v1/strength/exercises/:id` (tier + muscles). */
export const useExerciseDetail = (
  planEx: PlanExercise | undefined,
  entry: CatalogEntry | undefined,
): ExerciseDetailData => {
  const [meta, setMeta] = useState<PlanExerciseMeta | null>(null);
  const [metaDone, setMetaDone] = useState(!planEx);
  const [strength, setStrength] = useState<StrengthState>({ status: "loading" });

  // The route can swap lifts on the same screen instance: never keep the previous lift's meta.
  useEffect(() => {
    setMeta(null);
    setMetaDone(!planEx);
    if (!planEx) return;
    let alive = true;
    void loadPlanExerciseMeta(planEx).then((m) => {
      if (!alive) return;
      setMeta(m);
      setMetaDone(true);
    });
    return () => {
      alive = false;
    };
  }, [planEx]);

  // Plan canonical id wins over a fuzzy catalog name match.
  const canonicalId = meta?.canonicalId ?? entry?.canonicalId ?? null;

  useEffect(() => {
    if (!metaDone) return;
    if (!canonicalId) {
      setStrength({ status: "none" });
      return;
    }
    let alive = true;
    setStrength({ status: "loading" });
    getExerciseStrength(canonicalId)
      .then((data) => alive && setStrength({ status: "ready", data }))
      .catch((err: unknown) => {
        logger.warn("exercise.strength.failed", { message: errorMessage(err) });
        if (alive) setStrength({ status: "none" });
      });
    return () => {
      alive = false;
    };
  }, [canonicalId, metaDone]);

  const serverMuscles = strength.status === "ready" ? strength.data.muscles : null;
  const muscles = useMemo(
    () =>
      resolveMuscles({
        plan: meta?.muscles,
        server: serverMuscles,
        // Unmatched plan lifts get a generic entry with no muscles: nothing to fall back to.
        catalog: entry ?? null,
      }),
    [meta, serverMuscles, entry],
  );

  return { canonicalId, muscles, strength };
};
