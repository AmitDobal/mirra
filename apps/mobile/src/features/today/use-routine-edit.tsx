import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  addPlanExercise,
  deletePlanExercise,
  patchPlanExercise,
  type PlanExercise,
  type PlanWorkout,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";
import { FormSheet, type FormField } from "@/ui/FormSheet";

const FIELDS: readonly FormField[] = [
  { key: "name", label: "Exercise", placeholder: "e.g. Incline dumbbell press" },
  { key: "sets", label: "Sets", numeric: true },
  { key: "reps", label: "Reps (e.g. 8-12)" },
  { key: "rest", label: "Rest (sec)", numeric: true },
];

const toInt = (raw: string | undefined, fallback: number): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

type Editing = { readonly mode: "add" } | { readonly mode: "edit"; readonly exercise: PlanExercise };

/**
 * Today's routine edits (no AI): long-press a lift → Edit / Delete, "Add exercise" → sheet.
 * Calls the plan API then `onChanged` (re-hydrates Today). Render `sheet` once.
 */
export const useRoutineEdit = (
  workout: PlanWorkout | null,
  onChanged: () => Promise<void>,
  onNotice: (message: string) => void,
) => {
  const [editing, setEditing] = useState<Editing | null>(null);

  const run = useCallback(
    async (action: () => Promise<unknown>, failure: string) => {
      try {
        await action();
        await onChanged();
      } catch (err) {
        logger.warn("routine.edit_failed", { message: errorMessage(err) });
        onNotice(failure);
      }
    },
    [onChanged, onNotice],
  );

  const handleDelete = useCallback(
    (exercise: PlanExercise) => {
      if (!workout) return;
      Alert.alert("Remove exercise?", exercise.name, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            void run(() => deletePlanExercise(workout.id, exercise.id), "Couldn't remove that exercise."),
        },
      ]);
    },
    [run, workout],
  );

  const openActions = useCallback(
    (exercise: PlanExercise) => {
      Alert.alert(exercise.name, `${exercise.targetSets}×${exercise.targetReps}`, [
        { text: "Edit", onPress: () => setEditing({ mode: "edit", exercise }) },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(exercise) },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [handleDelete],
  );

  const openAdd = useCallback(() => setEditing({ mode: "add" }), []);

  const initial = useMemo(() => {
    if (editing?.mode !== "edit") return { name: "", sets: "3", reps: "10", rest: "90" };
    const e = editing.exercise;
    return {
      name: e.name,
      sets: String(e.targetSets),
      reps: e.targetReps,
      rest: e.restSec != null ? String(e.restSec) : "",
    };
  }, [editing]);

  const handleSubmit = (values: Record<string, string>) => {
    const name = (values.name ?? "").trim();
    if (!editing || !workout || !name) return;
    const body = {
      name,
      targetSets: toInt(values.sets, 3),
      targetReps: (values.reps ?? "").trim() || "10",
      restSec: values.rest?.trim() ? toInt(values.rest, 90) : null,
    };
    if (editing.mode === "add") {
      void run(() => addPlanExercise(workout.id, body), "Couldn't add that exercise.");
      return;
    }
    void run(
      () => patchPlanExercise(workout.id, editing.exercise.id, body),
      "Couldn't save that exercise.",
    );
  };

  const sheet = (
    <FormSheet
      visible={editing !== null}
      title={editing?.mode === "edit" ? "Edit exercise" : "Add exercise"}
      submitLabel={editing?.mode === "edit" ? "Save" : "Add"}
      fields={FIELDS}
      initial={initial}
      onClose={() => setEditing(null)}
      onSubmit={handleSubmit}
    />
  );

  return { openActions, openAdd, sheet, canEdit: workout !== null };
};
