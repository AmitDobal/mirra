import { router } from "expo-router";
import { ArrowRight, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { rebuildMock as m } from "./mock";

/** S21 Rebuild preview. */
export const RebuildScreen = () => {
  const handleClose = () => router.back();
  const handleAccept = () => router.replace("/(tabs)/coach");

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={handleClose}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel tone="lime">AI Optimization</CapsLabel>
        <View className="w-11" />
      </View>

      <Text className="font-headline text-headline-lg text-on-surface">Rebuild Preview</Text>
      <View className="mt-space-sm self-start rounded-full bg-primary-fixed px-3 py-1">
        <CapsLabel tone="dark">{m.badge}</CapsLabel>
      </View>
      <Text className="mt-space-md font-headline-sm text-headline-sm text-on-surface">
        {m.title}
      </Text>
      <Text className="mt-1 font-body text-body-md text-on-surface-variant">
        Stimulus load balance: {m.stimulus}
      </Text>

      <View className="my-space-md flex-row gap-space-sm">
        {m.metrics.map((met) => (
          <View key={met.label} className="flex-1 rounded-lg bg-surface-container-high p-space-md">
            <CapsLabel>{met.label}</CapsLabel>
            <Text className="mt-1 font-display text-headline-md text-on-surface">{met.value}</Text>
            <Text className="font-body text-body-sm text-primary-fixed">{met.meta}</Text>
          </View>
        ))}
      </View>

      <View className="mb-space-sm flex-row items-center justify-between">
        <CapsLabel>Schedule Comparison</CapsLabel>
        <View className="rounded-full bg-primary-fixed px-2 py-0.5">
          <CapsLabel tone="dark">Recommended</CapsLabel>
        </View>
      </View>

      {m.days.map((d) => (
        <View
          key={d.day}
          className="mb-space-sm flex-row gap-space-md rounded-lg bg-surface-container-low p-space-md"
        >
          <View className="w-12">
            <Text className="font-label-bold text-label-lg text-primary-fixed">{d.day}</Text>
            <CapsLabel>{d.tag}</CapsLabel>
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{d.title}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{d.meta}</Text>
          </View>
        </View>
      ))}

      <View className="mb-space-md rounded-lg bg-secondary-container p-space-md">
        <CapsLabel>Coach Kinetic AI · Smart Adaptation</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-secondary-container">
          Smarter rhythm, zero punishment. Calibrated to prevent fatigue spikes while maximizing
          hypertrophy.
        </Text>
      </View>

      <LimeCta
        label="Accept New Plan"
        onPress={handleAccept}
        icon={<ArrowRight size={18} color={color.onPrimaryFixed} />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Customize days manually"
        onPress={handleClose}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">
          Customize days manually
        </Text>
      </Pressable>
    </ScreenScroll>
  );
};
