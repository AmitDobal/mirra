import { deleteLocalMeal, updateLocalMeal } from "@/db";
import { deleteMeal, MirraApiError, patchMeal, type MealSlot } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { useFuelStore, type LocalMeal } from "./fuel-store";
import { useMealPlanStore } from "./meal-plan-store";

export type MealEditValues = {
  readonly name: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly slot: MealSlot;
};

const ref = (meal: LocalMeal) => ({ id: meal.id, eatenAt: meal.eatenAt, name: meal.name });
const isNotFound = (err: unknown) => err instanceof MirraApiError && err.status === 404;
/** Rows that never reached the API (offline fallback) only exist locally. */
const isLocalOnly = (meal: LocalMeal) => meal.source === "manual";

const setTip = (tip: string) => useFuelStore.setState({ tip });

/** Edit a logged meal: optimistic UI → PATCH /v1/meals/:id → local SQLite mirror. */
export const editMeal = async (meal: LocalMeal, values: MealEditValues): Promise<void> => {
  const before = useFuelStore.getState().meals;
  useFuelStore.setState((s) => ({
    meals: s.meals.map((m) =>
      m.id === meal.id
        ? { ...m, name: values.name, calories: values.calories, proteinG: values.proteinG, slot: values.slot }
        : m,
    ),
  }));
  try {
    if (!isLocalOnly(meal)) {
      await patchMeal(meal.id, {
        name: values.name,
        kcal: values.calories,
        proteinG: values.proteinG,
        mealSlot: values.slot,
      });
    }
  } catch (err) {
    logger.warn("fuel.edit_meal_failed", { message: errorMessage(err) });
    useFuelStore.setState({ meals: before });
    setTip("Couldn't save that edit — try again.");
    return;
  }
  await updateLocalMeal(ref(meal), {
    name: values.name,
    kcal: values.calories,
    proteinG: values.proteinG,
    mealSlot: values.slot,
  }).catch((err) => logger.warn("fuel.edit_meal_local_failed", { message: errorMessage(err) }));
  await useFuelStore.getState().hydrate();
};

/** Delete a logged meal: optimistic UI → DELETE /v1/meals/:id → local SQLite mirror. */
export const removeMeal = async (meal: LocalMeal): Promise<void> => {
  const before = useFuelStore.getState().meals;
  useFuelStore.setState((s) => ({ meals: s.meals.filter((m) => m.id !== meal.id) }));
  try {
    if (!isLocalOnly(meal)) await deleteMeal(meal.id);
  } catch (err) {
    if (!isNotFound(err)) {
      logger.warn("fuel.delete_meal_failed", { message: errorMessage(err) });
      useFuelStore.setState({ meals: before });
      setTip("Couldn't delete that meal — try again.");
      return;
    }
  }
  await deleteLocalMeal(ref(meal)).catch((err) =>
    logger.warn("fuel.delete_meal_local_failed", { message: errorMessage(err) }),
  );
  // A deleted plan meal re-opens in "Today's plan".
  await Promise.all([useFuelStore.getState().hydrate(), useMealPlanStore.getState().hydrate()]);
};
