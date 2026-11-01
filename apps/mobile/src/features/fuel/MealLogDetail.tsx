import { useCallback, useState } from "react";

import type { Meal } from "@/lib/api";

import { MealLogDetailSheet } from "./MealLogDetailSheet";

/** Tap a logged meal → detail sheet. Render `sheet` once in the screen. */
export const useMealLogDetail = () => {
  const [meal, setMeal] = useState<Meal | null>(null);
  const open = useCallback((m: Meal) => setMeal(m), []);
  const close = useCallback(() => setMeal(null), []);
  const sheet = <MealLogDetailSheet meal={meal} onClose={close} />;
  return { open, sheet };
};
