import { useMemo } from "react";

import { useMeStore } from "@/stores/me-store";

import { useGoal } from "./goal-store";
import { buildGoalView } from "./goal-view";

/** Goal body (SWR store) + me prefs (units, train days) → S44/S45/S46 view model. */
export const useGoalView = () => {
  const goal = useGoal();
  const prefs = useMeStore((s) => s.me?.preferences ?? null) as { units?: string; trainDays?: readonly number[] } | null;
  const unit = prefs?.units === "imperial" ? "lb" : "kg";
  const perWeek = prefs?.trainDays?.length ?? null;
  const view = useMemo(
    () => buildGoalView({ body: goal.data, unit, sessionsPerWeek: perWeek }),
    [goal.data, unit, perWeek],
  );
  return { ...goal, view };
};
