import { router } from "expo-router";
import { Bed, Check, Zap } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { coachMock as m } from "./mock";

/** S20 Daily check-in Coach. */
export const CoachScreen = () => {
  const [vector, setVector] = useState<string>(m.vectors[0].id);
  const handlePreview = () => router.push("/(tabs)/rebuild");

  return (
    <ScreenScroll>
      <View className="mb-space-md flex-row items-center justify-between">
        <View>
          <CapsLabel tone="lime">Mirra Coach</CapsLabel>
          <Text className="font-headline text-headline-lg text-on-surface">Daily Check In</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-fixed">
          <Zap size={20} color={color.onPrimaryFixed} />
        </View>
      </View>

      <CapsLabel>{m.date}</CapsLabel>
      <Text className="mb-space-md font-body text-body-sm text-on-surface-variant">{m.status}</Text>

      <View className="mb-space-md rounded-lg bg-primary-fixed p-space-lg">
        <CapsLabel tone="dark">Daily Calibration</CapsLabel>
        <Text className="mt-space-sm font-headline text-headline-lg text-on-primary-fixed">
          {m.title}
        </Text>
        <Text className="mt-space-sm font-body-medium text-body-md text-on-primary-fixed/85">
          {m.body}
        </Text>
        <View className="mt-space-md flex-row gap-space-sm">
          <Chip label="Ready to Push" active />
          <Chip label="Body Needs Rest" Icon={Bed} />
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>{m.week}</CapsLabel>
          <Text className="mt-1 font-headline-sm text-headline-sm text-primary-fixed">
            {m.balance}
          </Text>
          <Text className="mt-space-sm font-display text-headline-md text-on-surface">
            {m.workouts}
          </Text>
          <CapsLabel>Workouts logged</CapsLabel>
        </View>
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Deficit On Track</CapsLabel>
          <Text className="mt-space-sm font-display text-headline-lg text-on-surface">
            {m.deficit}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">kcal logged today</Text>
        </View>
      </View>

      <CapsLabel className="mb-space-sm">Select Recalibration Vector</CapsLabel>
      {m.vectors.map((v) => {
        const selected = vector === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setVector(v.id)}
            className={`mb-space-sm rounded-lg border p-space-md ${
              selected
                ? "border-primary-fixed bg-surface-container-low"
                : "border-transparent bg-surface-container-high"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-headline-sm text-headline-sm text-on-surface">{v.title}</Text>
              {v.recommended ? (
                <View className="rounded-full bg-primary-fixed px-2 py-0.5">
                  <CapsLabel tone="dark">Recommended</CapsLabel>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 font-body text-body-md text-on-surface-variant">{v.detail}</Text>
            {selected ? (
              <View className="mt-space-sm flex-row items-center gap-1">
                <Check size={14} color={color.primaryFixed} />
                <CapsLabel tone="lime">Selected</CapsLabel>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <View className="mb-space-md rounded-lg bg-secondary-container p-space-md">
        <CapsLabel>Engine Proposal · Zero Volume Loss</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-secondary-container">
          {m.proposal}
        </Text>
      </View>

      <LimeCta label="Preview Rebuilt Week" onPress={handlePreview} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Keep original schedule"
        onPress={() => undefined}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">
          Keep original schedule anyway
        </Text>
      </Pressable>
    </ScreenScroll>
  );
};

const Chip = ({
  label,
  active,
  Icon,
}: {
  label: string;
  active?: boolean;
  Icon?: typeof Bed;
}) => (
  <View
    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
      active ? "bg-on-primary-fixed" : "bg-on-primary-fixed/15"
    }`}
  >
    {Icon ? <Icon size={14} color={active ? color.primaryFixed : color.onPrimaryFixed} /> : null}
    <Text
      className={`font-label text-label-md ${
        active ? "text-primary-fixed" : "text-on-primary-fixed"
      }`}
    >
      {label}
    </Text>
  </View>
);
