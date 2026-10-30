import { router } from "expo-router";
import { Check, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { useTodayStore } from "@/features/today/today-store";

import { useWorkoutStore } from "./workout-store";

/** S17 Workout complete + selectable RPE. */
export const CompleteScreen = () => {
  const workoutTitle = useWorkoutStore((s) => s.workoutTitle);
  const kcal = useWorkoutStore((s) => s.kcal);
  const exercises = useWorkoutStore((s) => s.exercises);
  const rpe = useWorkoutStore((s) => s.rpe);
  const durationMin = useWorkoutStore((s) => s.durationMin);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const setRpe = useWorkoutStore((s) => s.setRpe);
  const reset = useWorkoutStore((s) => s.reset);
  const weekDays = useTodayStore((s) => s.weekDays);
  const dayIndex = useTodayStore((s) => s.dayIndex);

  const minutes =
    durationMin ||
    (startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60_000)) : 0);
  const nextDay = weekDays[dayIndex + 1] ?? weekDays.find((d, i) => i > dayIndex && d.workout);
  const nextLabel = nextDay?.workout?.title
    ? `Next lift: ${nextDay.workout.title} (${nextDay.date})`
    : "Next session will appear when your plan updates.";
  const recovery =
    rpe != null && rpe >= 8 ? "48–72 hours" : rpe != null && rpe >= 5 ? "36–48 hours" : "24–36 hours";

  const handleDone = () => {
    void useWorkoutStore.getState().finish().finally(() => {
      reset();
      router.replace("/(tabs)/today");
    });
  };

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
        <Text className="font-headline text-headline-lg text-on-surface">
          {workoutTitle || "Session"}
        </Text>
        <Text className="mt-1 font-body text-body-md text-on-surface-variant">
          Session complete.
        </Text>
        <Text className="mt-space-sm font-label-bold text-label-lg text-primary-fixed">
          {kcal} kcal burned
        </Text>
        {rpe != null ? (
          <CapsLabel className="mt-1" tone="lime">{`RPE ${rpe} saved`}</CapsLabel>
        ) : (
          <CapsLabel className="mt-1">Tap RPE below</CapsLabel>
        )}
      </View>

      <View className="mb-space-lg flex-row gap-space-sm">
        <Metric value={String(minutes)} label="MINUTES" />
        <Metric value={String(kcal)} label="KCAL EST" />
        <Metric
          value={String(exercises.length).padStart(2, "0")}
          label="EXERCISES"
        />
      </View>

      <View className="mb-space-lg rounded-lg bg-surface-container-high p-space-md">
        <Text className="font-headline-sm text-headline-sm text-on-surface">How hard was it?</Text>
        <CapsLabel className="mt-1">RPE Scale</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-surface-variant">
          Mirra uses this to calibrate recovery &amp; next session load.
        </Text>
        <View className="mt-space-md flex-row justify-between">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const selected = rpe === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`RPE ${n}`}
                accessibilityState={{ selected }}
                onPress={() => setRpe(n)}
                className={`h-9 w-7 items-center justify-center rounded-sm ${
                  selected ? "bg-primary-fixed" : "bg-surface-container-highest"
                }`}
              >
                <Text
                  className={`font-label-bold text-label-md ${
                    selected ? "text-on-primary-fixed" : "text-on-surface"
                  }`}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-space-sm flex-row justify-between">
          <Text className="font-body text-body-sm text-on-surface-variant">Light</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">Max</Text>
        </View>
      </View>

      <View className="mb-space-lg rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel tone="lime">{`Recovery projected: ${recovery}`}</CapsLabel>
        <Text className="mt-space-sm font-body text-body-md text-on-surface-variant">
          {nextLabel}
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
