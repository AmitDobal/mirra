import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { getMyFoodPrefs } from "@/lib/api";
import { sx } from "@/theme/sx";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { FormSheet, type FormChoice, type FormField } from "@/ui/FormSheet";
import { LimeCta } from "@/ui/LimeCta";

import type { MealSlot, PlannedMeal } from "@/lib/api";

import { needsDietPrompt } from "./diet-prefs";
import { slotKey } from "./fuel-helpers";
import { SLOT_LABELS, toAmount } from "./MealEditor";
import { DietPrefsSheet } from "./DietPrefsSheet";
import { LoggedRow, PlannedCard } from "./MealPlanCard";
import { isPlannedOpen, useMealPlanStore } from "./meal-plan-store";

const ADD_FIELDS: readonly FormField[] = [
  { key: "name", label: "Name", placeholder: "e.g. Greek yogurt bowl" },
  { key: "kcal", label: "Calories (kcal)", numeric: true },
  { key: "protein", label: "Protein (g)", numeric: true },
];
const ADD_CHOICE: FormChoice = { key: "slot", label: "Meal", options: SLOT_LABELS };
const ADD_INITIAL = { name: "", kcal: "", protein: "", slot: "Snack" } as const;

/** Fuel "Today's plan" — compact meal rows under the macro meters. */
export const MealPlanSection = () => {
  const plan = useMealPlanStore((s) => s.plan);
  const generating = useMealPlanStore((s) => s.generating);
  const busyId = useMealPlanStore((s) => s.busyId);
  const error = useMealPlanStore((s) => s.error);
  const generate = useMealPlanStore((s) => s.generate);
  const log = useMealPlanStore((s) => s.log);
  const swap = useMealPlanStore((s) => s.swap);
  const rebalance = useMealPlanStore((s) => s.rebalance);
  const addItem = useMealPlanStore((s) => s.addItem);
  const deleteItem = useMealPlanStore((s) => s.deleteItem);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [needsPrefs, setNeedsPrefs] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const refreshNeedsPrefs = useCallback(async () => {
    try {
      setNeedsPrefs(needsDietPrompt(await getMyFoodPrefs()));
    } catch {
      setNeedsPrefs(false); // offline: don't block generating
    }
  }, []);

  useEffect(() => {
    void refreshNeedsPrefs();
  }, [refreshNeedsPrefs]);

  const handleGenerate = () => {
    if (needsPrefs) setSheetOpen(true);
    else void generate();
  };

  const handlePrefsSaved = () => {
    setSheetOpen(false);
    setNeedsPrefs(false);
    // Existing plan was built with old prefs → rebuild; otherwise first generate.
    void generate(Boolean(plan));
  };

  const handleAddSubmit = (values: Record<string, string>) => {
    const name = (values.name ?? "").trim();
    if (!name) return;
    void addItem({
      name,
      slot: slotKey(values.slot ?? "snack") as MealSlot,
      kcal: Math.round(toAmount(values.kcal)),
      proteinG: Math.round(toAmount(values.protein)),
    });
  };

  const handleDelete = (meal: PlannedMeal) =>
    Alert.alert("Remove from plan?", meal.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void deleteItem(meal) },
    ]);

  const hasOpen = Boolean(plan?.meals.some(isPlannedOpen));
  const doneCount = plan ? plan.meals.filter((m) => !isPlannedOpen(m)).length : 0;

  return (
    <View style={sx("mb-space-md")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <View>
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
            Today&apos;s plan
          </Text>
          <View style={sx("flex-row flex-wrap items-center gap-space-sm")}>
            {plan ? (
              <>
                <CapsLabel>
                  {doneCount}/{plan.meals.length} done
                </CapsLabel>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Food prefs"
                  onPress={() => setSheetOpen(true)}
                >
                  <CapsLabel tone="lime">Food prefs</CapsLabel>
                </Pressable>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add item to today's plan"
              onPress={() => setAddOpen(true)}
            >
              <CapsLabel tone="lime">Add item</CapsLabel>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adjust meals with AI"
              onPress={() => router.push("/(tabs)/plan-chat")}
              style={sx("flex-row items-center gap-1.5")}
            >
              <AiBadge label={false} tone="lime" size={16} />
              <CapsLabel tone="lime">Ask coach</CapsLabel>
            </Pressable>
          </View>
        </View>
        {plan && hasOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rebalance rest of day"
            disabled={generating}
            onPress={() => void rebalance("manual")}
            style={sx("rounded-full border border-primary-fixed/40 bg-primary-fixed/15 px-space-md py-2")}
          >
            <CapsLabel tone="lime">{generating ? "Updating…" : "Rebalance"}</CapsLabel>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={sx("mb-space-sm")}>
          <CapsLabel tone="alert">{error}</CapsLabel>
        </View>
      ) : null}

      {plan ? (
        plan.meals.map((meal) =>
          isPlannedOpen(meal) ? (
            <PlannedCard
              key={meal.id}
              meal={meal}
              busy={busyId !== null}
              onLog={(m) => void log(m)}
              onSwap={(m) => void swap(m)}
              onDelete={handleDelete}
            />
          ) : (
            <LoggedRow key={meal.id} meal={meal} />
          ),
        )
      ) : (
        <View
          style={sx(
            "overflow-hidden rounded-lg border border-primary-fixed/40 bg-surface-container-high p-space-md",
          )}
        >
          <Text style={sx("mb-space-sm font-headline-semi text-body-lg text-on-surface")}>
            Hit today&apos;s macros
          </Text>
          <LimeCta
            label={generating ? "Building…" : "Generate today's plan"}
            onPress={handleGenerate}
            icon={<AiBadge label={false} tone="dark" size={16} />}
            style={{ height: 44 }}
          />
        </View>
      )}

      <FormSheet
        visible={addOpen}
        title="Add to today's plan"
        submitLabel="Add"
        fields={ADD_FIELDS}
        choice={ADD_CHOICE}
        initial={ADD_INITIAL}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />
      <DietPrefsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={handlePrefsSaved}
      />
    </View>
  );
};
