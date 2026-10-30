import { router } from "expo-router";
import { ArrowLeft, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { compareMock as m } from "./mock";

/** S23 Mirror comparison. */
export const CompareScreen = () => {
  const [view, setView] = useState<(typeof m.views)[number]>("Front View");
  const handleBack = () => router.back();

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <ArrowLeft size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel>Inspection Modal</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={() => undefined}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <Share2 size={18} color={color.onSurface} />
        </Pressable>
      </View>

      <Text className="font-headline-sm text-headline-sm text-on-surface">{m.title}</Text>
      <CapsLabel tone="lime" className="mt-1">
        {m.days}
      </CapsLabel>

      <View className="my-space-md flex-row gap-space-xs">
        {m.views.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
            onPress={() => setView(v)}
            className={`flex-1 items-center rounded-full py-2 ${
              view === v ? "bg-primary-fixed" : "bg-surface-container-high"
            }`}
          >
            <Text
              className={`font-label text-label-md ${
                view === v ? "text-on-primary-fixed" : "text-on-surface-variant"
              }`}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="h-56 flex-1 items-center justify-center rounded-lg bg-surface-container-highest">
          <CapsLabel>Current · Day 84</CapsLabel>
        </View>
        <View className="h-56 flex-1 items-center justify-center rounded-lg bg-surface-container-high">
          <CapsLabel>Baseline · Day 1</CapsLabel>
        </View>
      </View>

      <View className="mb-space-md self-center rounded-full bg-surface-container-low px-3 py-1">
        <CapsLabel tone="lime">Ghost Alignment: ON · Drag to inspect</CapsLabel>
      </View>

      <CapsLabel className="mb-space-sm">Mirra Vision Engine · V2.4 Delta</CapsLabel>
      {m.metrics.map((met) => (
        <View
          key={met.label}
          className="mb-space-sm flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md"
        >
          <View className="flex-1 pr-space-sm">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{met.label}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{met.detail}</Text>
          </View>
          <View className="items-end">
            <Text className="font-display text-headline-md text-primary-fixed">{met.value}</Text>
            <CapsLabel>{met.tag}</CapsLabel>
          </View>
        </View>
      ))}

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Active Consistency</CapsLabel>
          <Text className="font-display text-headline-lg text-on-surface">{m.consistency}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">42 of 48 workouts</Text>
        </View>
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Postural Symmetry</CapsLabel>
          <Text className="font-display text-headline-lg text-on-surface">{m.symmetry}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">/100 balanced</Text>
        </View>
      </View>

      <LimeCta label="Export Side-by-Side" onPress={() => undefined} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare different dates"
        onPress={handleBack}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">
          Compare Different Dates
        </Text>
      </Pressable>
    </ScreenScroll>
  );
};
