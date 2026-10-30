import { router } from "expo-router";
import { Camera, ChevronRight, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { progressMock as m } from "./mock";

/** S22 Progress gallery. */
export const ProgressScreen = () => {
  const handleCompare = () => router.push("/(tabs)/compare");

  return (
    <ScreenScroll>
      <CapsLabel tone="lime">Progression Index</CapsLabel>
      <Text className="font-headline text-headline-lg text-on-surface">Progress Gallery</Text>
      <Text className="mb-space-md font-body text-body-md text-on-surface-variant">{m.cycle}</Text>

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-low p-space-md">
        <View className="mb-space-sm flex-row items-center justify-between">
          <CapsLabel>{m.delta}</CapsLabel>
          <View className="flex-row items-center gap-1">
            <Lock size={12} color={color.onSurfaceVariant} />
            <CapsLabel>On-Device</CapsLabel>
          </View>
        </View>
        <View className="flex-row gap-space-sm">
          <PhotoSlot label="Baseline" sub={m.baseline} />
          <PhotoSlot label="Current" sub={m.current} highlight />
        </View>
        <LimeCta
          label="Open Full Delta Biometric Split"
          onPress={handleCompare}
          className="mt-space-md"
        />
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        {m.stats.map((s) => (
          <View key={s.label} className="flex-1 rounded-lg bg-surface-container-high p-space-md">
            <CapsLabel>{s.label}</CapsLabel>
            <Text className="mt-1 font-display text-headline-md text-primary-fixed">{s.value}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{s.unit}</Text>
          </View>
        ))}
      </View>

      <View className="mb-space-sm flex-row items-center justify-between">
        <Text className="font-headline-sm text-headline-sm text-on-surface">Biometric Chronology</Text>
        <CapsLabel>4 check-ins</CapsLabel>
      </View>

      {m.entries.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${e.when}`}
          onPress={handleCompare}
          className="mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md"
        >
          <View className="h-12 w-12 rounded-sm bg-surface-container-highest" />
          <View className="flex-1">
            <Text className="font-label text-label-md text-primary-fixed">{e.when}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{e.note}</Text>
            <Text className="font-body-medium text-body-md text-on-surface">
              {e.kg} kg · {e.bf} BF
            </Text>
          </View>
          <ChevronRight size={18} color={color.onSurfaceVariant} />
        </Pressable>
      ))}

      <LimeCta
        label="Scan Today's Shape Check-in"
        onPress={handleCompare}
        className="mt-space-sm"
        icon={<Camera size={18} color={color.onPrimaryFixed} />}
      />
    </ScreenScroll>
  );
};

const PhotoSlot = ({
  label,
  sub,
  highlight,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
}) => (
  <View className="flex-1">
    <View
      className={`mb-space-xs h-40 items-center justify-center rounded-lg ${
        highlight ? "bg-primary-fixed/20 border border-primary-fixed" : "bg-surface-container-highest"
      }`}
    >
      <Text className="font-label-bold text-label-lg text-on-surface-variant">{label}</Text>
    </View>
    <CapsLabel>{sub}</CapsLabel>
  </View>
);
