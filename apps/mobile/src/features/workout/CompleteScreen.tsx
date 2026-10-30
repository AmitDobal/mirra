import { router } from "expo-router";
import { Check, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { completeMock as m } from "./mock";

/** S17 Workout complete + RPE. */
export const CompleteScreen = () => {
  const handleDone = () => router.replace("/(tabs)/today");

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-lg flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={handleDone}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel>Session Logged</CapsLabel>
        <View className="w-11" />
      </View>

      <View className="mb-space-lg items-center">
        <View className="mb-space-md h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
          <Check size={32} color={color.onPrimaryFixed} strokeWidth={3} />
        </View>
        <Text className="font-headline text-headline-lg text-on-surface">{m.title}</Text>
        <Text className="mt-1 font-body text-body-md text-on-surface-variant">
          {m.subtitle}
        </Text>
        <Text className="mt-space-sm font-label-bold text-label-lg text-primary-fixed">
          {m.kcal} kcal burned
        </Text>
        <CapsLabel className="mt-1">{m.cycle}</CapsLabel>
      </View>

      <View className="mb-space-lg flex-row gap-space-sm">
        <Metric value={m.minutes} label="MINUTES" />
        <Metric value={m.volume} label="KG VOLUME" />
        <Metric value={m.exercises} label="EXERCISES" />
      </View>

      <View className="mb-space-lg rounded-lg bg-surface-container-low p-space-md">
        <View className="mb-space-sm flex-row items-center justify-between">
          <CapsLabel>Set Intensity Curve</CapsLabel>
          <Text className="font-label-bold text-label-md text-primary-fixed">
            Target Hit {m.hit}
          </Text>
        </View>
        <View className="h-16 flex-row items-end gap-1">
          {[26, 36, 46, 55, 62, 58, 50].map((h, i) => (
            <View key={i} className="flex-1 rounded-sm bg-primary-fixed" style={{ height: h }} />
          ))}
        </View>
      </View>

      <View className="mb-space-lg rounded-lg bg-surface-container-high p-space-md">
        <Text className="font-headline-sm text-headline-sm text-on-surface">
          How hard was it?
        </Text>
        <CapsLabel className="mt-1">RPE Scale</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-surface-variant">
          Mirra uses this to calibrate recovery &amp; next session load.
        </Text>
        <View className="mt-space-md flex-row justify-between">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`RPE ${n}`}
              className={`h-9 w-7 items-center justify-center rounded-sm ${
                n === 8 ? "bg-primary-fixed" : "bg-surface-container-highest"
              }`}
            >
              <Text
                className={`font-label-bold text-label-md ${
                  n === 8 ? "text-on-primary-fixed" : "text-on-surface"
                }`}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-space-sm flex-row justify-between">
          <Text className="font-body text-body-sm text-on-surface-variant">Light</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">Max</Text>
        </View>
      </View>

      <View className="mb-space-lg rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel tone="lime">{`Recovery projected: ${m.recovery}`}</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-surface-variant">
          Musculoskeletal strain is optimal. {m.next}
        </Text>
      </View>

      <LimeCta label="Done" onPress={handleDone} />
    </ScreenScroll>
  );
};

const Metric = ({ value, label }: { value: string; label: string }) => (
  <View className="flex-1 items-center rounded-lg bg-surface-container-high py-space-md">
    <Text className="font-display text-headline-lg text-on-surface">{value}</Text>
    <CapsLabel className="mt-1">{label}</CapsLabel>
  </View>
);
