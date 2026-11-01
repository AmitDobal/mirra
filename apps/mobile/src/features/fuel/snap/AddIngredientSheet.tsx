import { useMemo } from "react";

import { FormSheet, type FormField } from "@/ui/FormSheet";

import type { SnapIngredient } from "./snap-model";

const FIELDS: readonly FormField[] = [
  { key: "name", label: "Ingredient" },
  { key: "grams", label: "Grams", numeric: true },
  { key: "kcal", label: "Calories (kcal)", numeric: true },
  { key: "protein", label: "Protein (g)", numeric: true },
  { key: "carbs", label: "Carbs (g)", numeric: true },
  { key: "fat", label: "Fat (g)", numeric: true },
];

const num = (raw: string | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

type Props = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onAdd: (ingredient: Omit<SnapIngredient, "id">) => void;
};

/** "Add missing ingredient" — manual macros so no extra AI call is needed. */
export const AddIngredientSheet = ({ visible, onClose, onAdd }: Props) => {
  const initial = useMemo(() => ({}), []);
  const handleSubmit = (v: Record<string, string>) => {
    const name = (v.name ?? "").trim();
    if (!name) return;
    onAdd({
      name,
      grams: num(v.grams) || null,
      kcal: num(v.kcal),
      proteinG: num(v.protein),
      carbsG: num(v.carbs),
      fatG: num(v.fat),
    });
  };
  return (
    <FormSheet
      visible={visible}
      title="Add ingredient"
      submitLabel="Add"
      fields={FIELDS}
      initial={initial}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};
