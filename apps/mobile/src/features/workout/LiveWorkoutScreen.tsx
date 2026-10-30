import { router } from "expo-router";
import {
  CheckCircle2,
  Flame,
  Heart,
  Pause,
  SkipForward,
  X,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenFixed } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { liveMock as m } from "./mock";

/** S16 Live workout HUD. */
export const LiveWorkoutScreen = () => {
  const handleClose = () => router.back();
  const handleFinish = () => router.replace("/workout/complete");
  const handleLog = () => router.replace("/workout/complete");

  return (
    <ScreenFixed>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close workout"
          onPress={handleClose}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel tone="lime">Mirra Live</CapsLabel>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high">
          <Pause size={20} color={color.onSurface} />
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <HudChip Icon={Flame} value={`${m.kcal} KCAL`} />
        <HudChip Icon={Heart} value={`${m.bpm} BPM`} label="SETS" />
      </View>

      <View className="mb-space-sm flex-1 justify-center rounded-lg bg-surface-container-low p-space-lg">
        <CapsLabel>{m.exerciseIndex}</CapsLabel>
        <Text className="mt-1 font-body-medium text-body-md text-on-surface-variant">
          {m.category}
        </Text>
        <Text className="mt-space-sm font-headline text-headline-lg text-on-surface">
          {m.name}
        </Text>
        <View className="mt-space-lg flex-row justify-between">
          <Stat label="Elapsed" value={m.elapsed} />
          <Stat label="Rest Target" value={m.rest} />
          <Stat label="Current Set" value={`${m.set}`} sub={`/ ${m.totalSets}`} />
        </View>
        <View className="mt-space-lg rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Target Load Track</CapsLabel>
          <Text className="mt-1 font-headline-sm text-headline-sm text-primary-fixed">
            {m.load}
          </Text>
        </View>
        <View className="mt-space-md flex-row justify-between gap-space-xs">
          {m.sets.map((s) => (
            <View
              key={s.n}
              className={`flex-1 items-center rounded-sm py-space-sm ${
                s.done ? "bg-primary-fixed" : "bg-surface-container-highest"
              }`}
            >
              <Text
                className={`font-label-bold text-label-caps ${
                  s.done ? "text-on-primary-fixed" : "text-on-surface-variant"
                }`}
              >
                SET {s.n}
              </Text>
              <Text
                className={`font-body text-body-sm ${
                  s.done ? "text-on-primary-fixed" : "text-on-surface"
                }`}
              >
                {s.load}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <LimeCta
        label={`Log Set ${m.set} Complete`}
        onPress={handleLog}
        icon={<CheckCircle2 size={20} color={color.onPrimaryFixed} />}
      />
      <View className="mt-space-md flex-row items-center justify-between px-space-sm">
        <TextLink label="Swap exercise" onPress={() => undefined} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip exercise"
          onPress={() => undefined}
          className="flex-row items-center gap-1"
        >
          <SkipForward size={16} color={color.onSurfaceVariant} />
          <Text className="font-label text-label-md text-on-surface-variant">Skip</Text>
        </Pressable>
        <TextLink label="Finish workout" onPress={handleFinish} />
      </View>
    </ScreenFixed>
  );
};

const HudChip = ({
  Icon,
  value,
  label,
}: {
  Icon: typeof Flame;
  value: string;
  label?: string;
}) => (
  <View className="flex-1 flex-row items-center gap-space-sm rounded-lg bg-surface-container-high px-space-md py-space-sm">
    <Icon size={18} color={color.primaryFixed} />
    <View>
      {label ? <CapsLabel>{label}</CapsLabel> : null}
      <Text className="font-label-bold text-label-lg text-on-surface">{value}</Text>
    </View>
  </View>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View>
    <CapsLabel>{label}</CapsLabel>
    <View className="flex-row items-baseline gap-1">
      <Text className="font-headline text-headline-md text-on-surface">{value}</Text>
      {sub ? (
        <Text className="font-body text-body-sm text-on-surface-variant">{sub}</Text>
      ) : null}
    </View>
  </View>
);

const TextLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
    <Text className="font-label text-label-md text-on-surface-variant">{label}</Text>
  </Pressable>
);
