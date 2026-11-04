import { useEffect, useState } from "react";

import { getProfile } from "@/db";
import { findCatalogByName } from "@/features/exercise/catalog";
import { loadPlanExerciseMeta } from "@/features/exercise/plan-meta";
import type { PlanExercise } from "@/lib/api";
import { getLibraryExercise, type ExerciseScoring } from "@/lib/api/exercise-library";
import { useMeStore } from "@/stores/me-store";

import { unitFor, type LoadUnit } from "./load-units";

/** Weight unit: server preference (`/v1/me`), else the local profile; kg until known. */
export const useLoadUnit = (): LoadUnit => {
  const serverUnits = useMeStore((s) => (s.me?.preferences as { units?: string } | null)?.units);
  const [localUnits, setLocalUnits] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getProfile()
      .then((p) => alive && setLocalUnits(p?.preferences?.units ?? null))
      .catch(() => undefined);
    void useMeStore.getState().ensureMe().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return unitFor(serverUnits ?? localUnits);
};

export type ExerciseLoadMeta = { readonly scoring: ExerciseScoring; readonly perHand: boolean };

/**
 * Library scoring for a plan lift ("bodyweight" → HUD logs added load) and whether the
 * load is per hand (dumbbells, AMI-183). Null until known.
 */
export const useExerciseLoadMeta = (ex: PlanExercise | undefined): ExerciseLoadMeta | null => {
  const [scoring, setScoring] = useState<{ id: string; value: ExerciseLoadMeta } | null>(null);
  useEffect(() => {
    if (!ex) return;
    let alive = true;
    void (async () => {
      const meta = await loadPlanExerciseMeta(ex);
      const canonicalId = meta?.canonicalId ?? findCatalogByName(ex.name)?.canonicalId ?? null;
      if (!canonicalId) return;
      const lib = await getLibraryExercise(canonicalId);
      if (alive) setScoring({ id: ex.id, value: { scoring: lib.scoring, perHand: lib.loadPerHand === true } });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ex]);
  return ex && scoring?.id === ex.id ? scoring.value : null;
};
