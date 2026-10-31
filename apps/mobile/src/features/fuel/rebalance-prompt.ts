import { Alert } from "react-native";

import { isOffPlanKcal, useMealPlanStore } from "./meal-plan-store";

/**
 * After a free-form meal: if it doesn't match any open planned slot,
 * offer to re-plan the rest of the day. Never auto-rewrites.
 */
export const promptRebalanceIfOffPlan = async (kcal: number): Promise<void> => {
  const store = useMealPlanStore.getState();
  if (!store.plan) return;
  await store.hydrate();
  const plan = useMealPlanStore.getState().plan;
  if (!plan || !plan.meals.some((m) => m.status === "planned")) return;
  if (!isOffPlanKcal(plan, kcal)) return;

  Alert.alert("Rebalance rest of day?", "That meal was off plan.", [
    { text: "Not now", style: "cancel" },
    {
      text: "Rebalance",
      onPress: () => void useMealPlanStore.getState().rebalance("off_plan_log"),
    },
  ]);
};
