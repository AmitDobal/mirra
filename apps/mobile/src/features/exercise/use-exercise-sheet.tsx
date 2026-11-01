import { useCallback, useMemo, useState } from "react";

import { useOnboardingStore } from "@/features/onboarding/store";
import { useTodayStore } from "@/features/today/today-store";
import {
  addPlanExercise,
  patchPlanExercise,
  type PlanExercise,
  type PlanWorkout,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { availableEquipment, type CatalogEntry } from "./catalog";
import { SwapAddSheet, type SheetMode } from "./SwapAddSheet";

/**
 * Swap / add flow shared by the hub and detail screens (S27).
 * Writes through the plan API, then re-hydrates Today so every surface agrees.
 * Render `sheet` once.
 */
export const useExerciseSheet = (
  workout: PlanWorkout | null,
  onNotice: (message: string) => void,
) => {
  const [mode, setMode] = useState<SheetMode | null>(null);
  const hydrate = useTodayStore((s) => s.hydrate);
  const equipmentIds = useOnboardingStore((s) => s.equipment);
  const available = useMemo(() => availableEquipment(equipmentIds), [equipmentIds]);

  const openAdd = useCallback(() => {
    if (!workout) return onNotice("No session today to add to.");
    setMode({ kind: "add" });
  }, [onNotice, workout]);

  const openSwap = useCallback((exercise: PlanExercise) => setMode({ kind: "swap", exercise }), []);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string, failure: string) => {
      try {
        await action();
        await hydrate({ keepSelection: true });
        onNotice(success);
      } catch (err) {
        logger.warn("exercise.edit_failed", { message: errorMessage(err) });
        onNotice(failure);
      }
    },
    [hydrate, onNotice],
  );

  /** Add a catalog lift to today's session (also used by the detail "Add to session" bar). */
  const addEntry = useCallback(
    (entry: CatalogEntry) => {
      if (!workout) return onNotice("No session today to add to.");
      return run(
        () =>
          addPlanExercise(workout.id, {
            name: entry.name,
            targetSets: entry.sets,
            targetReps: entry.reps,
            restSec: entry.restSec,
            cue: entry.cue,
          }),
        `${entry.name} added to today.`,
        "Couldn't add that exercise.",
      );
    },
    [onNotice, run, workout],
  );

  const handleSelect = (entry: CatalogEntry) => {
    const current = mode;
    setMode(null);
    if (!current || !workout) return;
    if (current.kind === "add") return void addEntry(entry);
    void run(
      () =>
        patchPlanExercise(workout.id, current.exercise.id, {
          name: entry.name,
          targetSets: current.exercise.targetSets,
          targetReps: entry.reps,
          restSec: entry.restSec,
          cue: entry.cue,
        }),
      `Swapped to ${entry.name}.`,
      "Couldn't swap that exercise.",
    );
  };

  const sheet = (
    <SwapAddSheet
      mode={mode}
      session={workout?.exercises ?? []}
      available={available}
      onClose={() => setMode(null)}
      onSelect={handleSelect}
    />
  );

  return { openSwap, openAdd, addEntry, sheet, canEdit: workout !== null };
};
