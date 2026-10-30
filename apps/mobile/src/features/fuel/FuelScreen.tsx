import { router } from "expo-router";
import { Camera, Droplets, Flame, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { fuelMock as m } from "./mock";

/** S18 Fuel dashboard. */
export const FuelScreen = () => {
  const handleLog = () => router.push("/(tabs)/log-meal");

  return (
    <ScreenScroll>
      <View className="mb-space-md">
        <Text className="font-headline text-headline-lg text-on-surface">Fuel</Text>
        <Text className="font-body text-body-md text-on-surface-variant">{m.header}</Text>
      </View>

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel>{m.date}</CapsLabel>
        <View className="mt-space-sm flex-row items-start justify-between">
          <View>
            <CapsLabel>Remaining Budget</CapsLabel>
            <View className="mt-space-xs flex-row items-baseline gap-space-xs">
              <Text className="font-display text-display-lg text-on-surface">{m.remaining}</Text>
              <Text className="font-headline-sm text-headline-sm text-on-surface-variant">
                kcal left
              </Text>
            </View>
            <Text className="mt-1 font-body text-body-sm text-on-surface-variant">
              {m.logged} logged · {m.target} target
            </Text>
          </View>
          <View className="items-center rounded-full bg-primary-fixed px-space-md py-space-sm">
            <Flame size={16} color={color.onPrimaryFixed} />
            <Text className="font-label-bold text-label-lg text-on-primary-fixed">{m.pct}</Text>
            <CapsLabel tone="dark">Of Goal</CapsLabel>
          </View>
        </View>
        <View className="mt-space-md gap-space-sm">
          {m.macros.map((mac) => (
            <View key={mac.name}>
              <View className="mb-1 flex-row justify-between">
                <CapsLabel>{mac.name}</CapsLabel>
                <Text className="font-body text-body-sm text-on-surface">
                  {mac.cur}/{mac.goal} · {mac.pct}
                </Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                <View
                  className="h-full rounded-full bg-primary-fixed"
                  style={{ width: mac.pct as `${number}%` }}
                />
              </View>
            </View>
          ))}
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
          onPress={handleLog}
          variant="dark"
          icon={<Camera size={18} color={color.onSurface} />}
        />
      </View>

      <View className="mb-space-sm flex-row items-center justify-between">
        <Text className="font-headline-sm text-headline-sm text-on-surface">Today&apos;s Meals</Text>
        <CapsLabel>2 of 4 logged</CapsLabel>
      </View>

      {m.meals.map((meal) => (
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
              {meal.kcal} kcal · {meal.protein}
            </Text>
          </View>
          {meal.done ? (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-fixed">
              <Text className="font-label-bold text-label-md text-on-primary-fixed">✓</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log ${meal.slot}`}
              onPress={handleLog}
              className="rounded-full bg-surface-container-highest px-3 py-1.5"
            >
              <Text className="font-label text-label-md text-on-surface">Log</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View className="mt-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-low p-space-md">
        <Droplets size={22} color={color.primaryFixed} />
        <View>
          <CapsLabel>Hydration Tracker</CapsLabel>
          <Text className="font-body-medium text-body-md text-on-surface">
            {m.water.logged} logged · Goal {m.water.goal}
          </Text>
        </View>
      </View>
    </ScreenScroll>
  );
};
