import { router } from "expo-router";
import { Camera, Droplets, Flame, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { selectLoggedKcal, useFuelStore } from "./fuel-store";

/** S18 Fuel dashboard — SQLite meals. */
export const FuelScreen = () => {
  const meals = useFuelStore((s) => s.meals);
  const target = useFuelStore((s) => s.target);
  const proteinTarget = useFuelStore((s) => s.proteinTarget);
  const hydrate = useFuelStore((s) => s.hydrate);
  const snapPlaceholder = useFuelStore((s) => s.snapPlaceholder);
  const [snapNote, setSnapNote] = useState<string | null>(null);
  const [water, setWater] = useState(0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const logged = selectLoggedKcal(meals);
  const remaining = Math.max(0, (target || 0) - logged);
  const pct = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const protein = meals.reduce((s, meal) => s + meal.proteinG, 0);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleLog = () => router.push("/(tabs)/log-meal");
  const handleSnap = async () => {
    const meal = await snapPlaceholder();
    setSnapNote(`Saved ${meal.name}`);
  };

  return (
    <ScreenScroll>
      <View className="mb-space-md">
        <Text className="font-headline text-headline-lg text-on-surface">Fuel</Text>
        <Text className="font-body text-body-md text-on-surface-variant">
          Target {target || "—"} kcal
          {proteinTarget != null ? ` · ${proteinTarget}g protein` : ""}
        </Text>
      </View>

      {snapNote ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSnapNote(null)}
          className="mb-space-sm self-start rounded-full bg-primary-fixed/20 px-3 py-1"
        >
          <CapsLabel tone="lime">{snapNote}</CapsLabel>
        </Pressable>
      ) : null}

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel>{dateLabel}</CapsLabel>
        <View className="mt-space-sm flex-row items-start justify-between">
          <View>
            <CapsLabel>Remaining Budget</CapsLabel>
            <View className="mt-space-xs flex-row items-baseline gap-space-xs">
              <Text className="font-display text-display-lg text-on-surface">{remaining}</Text>
              <Text className="font-headline-sm text-headline-sm text-on-surface-variant">
                kcal left
              </Text>
            </View>
            <Text className="mt-1 font-body text-body-sm text-on-surface-variant">
              {logged} logged · {target || "—"} target
            </Text>
          </View>
          <View className="items-center rounded-full bg-primary-fixed px-space-md py-space-sm">
            <Flame size={16} color={color.onPrimaryFixed} />
            <Text className="font-label-bold text-label-lg text-on-primary-fixed">{pct}%</Text>
            <CapsLabel tone="dark">Of Goal</CapsLabel>
          </View>
        </View>
        <View className="mt-space-md">
          <View className="mb-1 flex-row justify-between">
            <CapsLabel>Protein</CapsLabel>
            <Text className="font-body text-body-sm text-on-surface">
              {protein}g
              {proteinTarget != null ? ` / ${proteinTarget}g` : " logged"}
            </Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
            <View
              className="h-full rounded-full bg-primary-fixed"
              style={{
                width: `${
                  proteinTarget
                    ? Math.min(100, Math.round((protein / proteinTarget) * 100))
                    : pct
                }%`,
              }}
            />
          </View>
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <LimeCta
          label="Log meal"
          onPress={handleLog}
          className="flex-1"
          icon={<Plus size={18} color={color.onPrimaryFixed} />}
        />
        <LimeCta
          label="Snap"
          onPress={() => void handleSnap()}
          variant="dark"
          icon={<Camera size={18} color={color.onSurface} />}
        />
      </View>

      <View className="mb-space-sm flex-row items-center justify-between">
        <Text className="font-headline-sm text-headline-sm text-on-surface">Today&apos;s Meals</Text>
        <CapsLabel>{meals.length} logged</CapsLabel>
      </View>

      {meals.length === 0 ? (
        <View className="mb-space-sm rounded-lg bg-surface-container-high p-space-md">
          <Text className="font-body text-body-md text-on-surface-variant">
            No meals yet — log or snap one.
          </Text>
        </View>
      ) : (
        meals.map((meal) => (
          <View
            key={meal.id}
            className="mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md"
          >
            <View className="h-14 w-14 items-center justify-center rounded-sm bg-surface-container-highest">
              <Flame size={22} color={color.primaryFixed} />
            </View>
            <View className="flex-1">
              <Text className="font-body text-body-sm text-on-surface-variant">
                {meal.slot} · {meal.time}
              </Text>
              <Text className="font-headline-sm text-headline-sm text-on-surface">{meal.name}</Text>
              <Text className="font-body text-body-sm text-on-surface-variant">
                {meal.calories} kcal · {meal.proteinG}g Protein
              </Text>
            </View>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-fixed">
              <Text className="font-label-bold text-label-md text-on-primary-fixed">✓</Text>
            </View>
          </View>
        ))
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log water"
        onPress={() => setWater((w) => Math.round((w + 0.25) * 100) / 100)}
        className="mt-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-low p-space-md"
      >
        <Droplets size={22} color={color.primaryFixed} />
        <View>
          <CapsLabel>Hydration Tracker</CapsLabel>
          <Text className="font-body-medium text-body-md text-on-surface">
            {water}L logged · Goal 3.0L
          </Text>
        </View>
      </Pressable>
    </ScreenScroll>
  );
};
