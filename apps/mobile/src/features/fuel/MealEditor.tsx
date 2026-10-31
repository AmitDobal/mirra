import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { MealSlot } from "@/lib/api";
import { FormSheet, type FormChoice, type FormField } from "@/ui/FormSheet";

import { slotKey } from "./fuel-helpers";
import type { LocalMeal } from "./fuel-store";
import { editMeal, removeMeal } from "./meal-edit";

const FIELDS: readonly FormField[] = [
  { key: "name", label: "Name" },
  { key: "kcal", label: "Calories (kcal)", numeric: true },
  { key: "protein", label: "Protein (g)", numeric: true },
];

const NO_VALUES: Record<string, string> = {};

export const SLOT_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const SLOT_CHOICE: FormChoice = { key: "slot", label: "Meal", options: SLOT_LABELS };

export const toSlotLabel = (slot: string): string => {
  const key = slotKey(slot);
  return key.charAt(0).toUpperCase() + key.slice(1);
};

/** Parse a non-negative number field; blank/invalid → 0. */
export const toAmount = (raw: string | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Long-press a logged meal → Edit / Delete. Render `sheet` once in the screen. */
export const useMealEditor = () => {
  const [editing, setEditing] = useState<LocalMeal | null>(null);

  const initial = useMemo<Record<string, string>>(
    () =>
      editing
        ? {
            name: editing.name,
            kcal: String(Math.round(editing.calories)),
            protein: String(Math.round(editing.proteinG)),
            slot: toSlotLabel(editing.slot),
          }
        : NO_VALUES,
    [editing],
  );

  const openActions = useCallback((meal: LocalMeal) => {
    Alert.alert(meal.name, "Edit or remove this logged meal.", [
      { text: "Edit", onPress: () => setEditing(meal) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete meal?", `${meal.name} · ${meal.calories} kcal`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => void removeMeal(meal) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const handleSubmit = (values: Record<string, string>) => {
    if (!editing) return;
    const name = (values.name ?? "").trim();
    if (!name) return;
    void editMeal(editing, {
      name,
      calories: Math.round(toAmount(values.kcal)),
      proteinG: Math.round(toAmount(values.protein)),
      slot: slotKey(values.slot ?? editing.slot) as MealSlot,
    });
  };

  const sheet = (
    <FormSheet
      visible={editing !== null}
      title="Edit meal"
      submitLabel="Save"
      fields={FIELDS}
      choice={SLOT_CHOICE}
      initial={initial}
      onClose={() => setEditing(null)}
      onSubmit={handleSubmit}
    />
  );

  return { openActions, sheet };
};
