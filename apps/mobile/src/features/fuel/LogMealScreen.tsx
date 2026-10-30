import { router } from "expo-router";
import { Camera, CheckCircle2, Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { logMealMock as m } from "./mock";

const slots = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

/** S19 Log meal modal. */
export const LogMealScreen = () => {
  const [slot, setSlot] = useState<(typeof slots)[number]>("Breakfast");
  const handleClose = () => router.back();
  const handleSave = () => router.back();

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={handleClose}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <Text className="font-headline-sm text-headline-sm text-on-surface">Log meal</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={handleSave}>
          <Text className="font-label-bold text-label-lg text-primary-fixed">Save</Text>
        </Pressable>
      </View>

      <View className="mb-space-md flex-row gap-space-xs">
        {slots.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: slot === s }}
            onPress={() => setSlot(s)}
            className={`flex-1 items-center rounded-full py-2 ${
              slot === s ? "bg-primary-fixed" : "bg-surface-container-high"
            }`}
          >
            <Text
              className={`font-label text-label-md ${
                slot === s ? "text-on-primary-fixed" : "text-on-surface-variant"
              }`}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-space-md items-center rounded-lg bg-surface-container-low p-space-lg">
        <View className="mb-space-sm flex-row items-center gap-1 rounded-full bg-primary-fixed/20 px-3 py-1">
          <Sparkles size={14} color={color.primaryFixed} />
          <CapsLabel tone="lime">{m.confidence}</CapsLabel>
        </View>
        <View className="h-36 w-full items-center justify-center rounded-lg bg-surface-container-highest">
          <Camera size={40} color={color.onSurfaceVariant} />
          <Text className="mt-2 font-body text-body-sm text-on-surface-variant">
            Vision Capture · Photo attached
          </Text>
        </View>
      </View>

      <Text className="font-headline-sm text-headline-sm text-on-surface">{m.name}</Text>
      <View className="mb-space-md mt-space-sm flex-row items-baseline gap-space-sm">
        <Text className="font-display text-display-lg text-on-surface">{m.kcal}</Text>
        <Text className="font-headline-sm text-headline-sm text-on-surface-variant">kcal</Text>
        <View className="rounded-full bg-surface-container-high px-2 py-0.5">
          <CapsLabel tone="lime">{m.goalPct}</CapsLabel>
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        {m.macros.map((mac) => (
          <View key={mac.name} className="flex-1 rounded-lg bg-surface-container-high p-space-md">
            <CapsLabel>{mac.name}</CapsLabel>
            <Text className="mt-1 font-headline text-headline-md text-on-surface">{mac.g}g</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{mac.pct}</Text>
          </View>
        ))}
      </View>

      <View className="mb-space-md rounded-lg bg-secondary-container p-space-md">
        <CapsLabel>Mirra Engine v2.4 · Dynamic Sync</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-secondary-container">
          {m.note}
        </Text>
      </View>

      <CapsLabel className="mb-space-sm">Quick Micro-Adds</CapsLabel>
      {m.adds.map((a) => (
        <View
          key={a.name}
          className="mb-space-xs flex-row items-center justify-between rounded-lg bg-surface-container-low px-space-md py-space-sm"
        >
          <Text className="font-body-medium text-body-md text-on-surface">{a.name}</Text>
          <Text className="font-label text-label-md text-primary-fixed">{a.meta}</Text>
        </View>
      ))}

      <LimeCta
        label="Save meal"
        onPress={handleSave}
        className="mt-space-md"
        icon={<CheckCircle2 size={20} color={color.onPrimaryFixed} />}
      />
    </ScreenScroll>
  );
};
