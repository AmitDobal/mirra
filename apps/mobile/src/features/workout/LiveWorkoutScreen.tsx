import { router } from "expo-router";
import {
  CheckCircle2,
  Flame,
  Heart,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenFixed } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { useWorkoutStore } from "./workout-store";

/** S16 Live workout HUD — log set / pause / finish. */
export const LiveWorkoutScreen = () => {
  const exercises = useWorkoutStore((s) => s.exercises);
  const exerciseIndex = useWorkoutStore((s) => s.exerciseIndex);
  const setIndex = useWorkoutStore((s) => s.setIndex);
  const sets = useWorkoutStore((s) => s.sets);
  const paused = useWorkoutStore((s) => s.paused);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const kcal = useWorkoutStore((s) => s.kcal);
  const finished = useWorkoutStore((s) => s.finished);
  const workoutTitle = useWorkoutStore((s) => s.workoutTitle);
  const logSet = useWorkoutStore((s) => s.logSet);
  const togglePause = useWorkoutStore((s) => s.togglePause);
  const skipExercise = useWorkoutStore((s) => s.skipExercise);
  const swapExercise = useWorkoutStore((s) => s.swapExercise);

  useEffect(() => {
    if (finished) {
      void useWorkoutStore.getState().finish().then(() => {
        router.replace("/workout/complete");
      });
    }
  }, [finished]);

  const ex = exercises[exerciseIndex];
  const elapsedMs = startedAt ? Date.now() - startedAt : 0;
  const elapsed = formatClock(paused ? 0 : Math.floor(elapsedMs / 1000));
  const rest = formatClock(ex?.restSec ?? 90);

  const handleClose = () => router.back();
  const handleFinish = () => {
    void useWorkoutStore.getState().finish().then(() => {
      router.replace("/workout/complete");
    });
  };
  const handleLog = () => {
    void logSet();
  };

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
        <CapsLabel tone="lime">{paused ? "Paused" : "Mirra Live"}</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? "Resume" : "Pause"}
          onPress={togglePause}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          {paused ? (
            <Play size={20} color={color.onSurface} fill={color.onSurface} />
          ) : (
            <Pause size={20} color={color.onSurface} />
          )}
        </Pressable>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <HudChip Icon={Flame} value={`${kcal} KCAL`} />
        <HudChip Icon={Heart} value={`${sets.filter((s) => s.done).length} DONE`} label="SETS" />
      </View>

      <View className="mb-space-sm flex-1 justify-center rounded-lg bg-surface-container-low p-space-lg">
        <CapsLabel>
          Exercise {exerciseIndex + 1} of {exercises.length}
        </CapsLabel>
        <Text className="mt-1 font-body-medium text-body-md text-on-surface-variant">
          {ex?.cue ?? workoutTitle}
        </Text>
        <Text className="mt-space-sm font-headline text-headline-lg text-on-surface">
          {ex?.name ?? "Movement"}
        </Text>
        <View className="mt-space-lg flex-row justify-between">
          <Stat label="Elapsed" value={elapsed} />
          <Stat label="Rest Target" value={rest} />
          <Stat label="Current Set" value={`${setIndex}`} sub={`/ ${sets.length}`} />
        </View>
        <View className="mt-space-lg rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Target Load Track</CapsLabel>
          <Text className="mt-1 font-headline-sm text-headline-sm text-primary-fixed">
            {ex?.targetReps ?? "—"} REPS · {sets.length} SETS
          </Text>
        </View>
        <View className="mt-space-md flex-row justify-between gap-space-xs">
          {sets.map((s) => (
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
        label={paused ? "Resume to log" : `Log Set ${setIndex} Complete`}
        onPress={paused ? togglePause : handleLog}
        icon={<CheckCircle2 size={20} color={color.onPrimaryFixed} />}
      />
      <View className="mt-space-md flex-row items-center justify-between px-space-sm">
        <TextLink label="Swap exercise" onPress={swapExercise} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip exercise"
          onPress={skipExercise}
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

const formatClock = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
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
