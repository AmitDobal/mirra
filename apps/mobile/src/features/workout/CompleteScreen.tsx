import { router } from "expo-router";
import { Check, Clock3, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { useTodayStore } from "@/features/today/today-store";

import { useWorkoutStore } from "./workout-store";
import { sx } from "@/theme/sx";

const RPE_LABELS: Record<number, string> = {
  1: "Very Light / Warmup",
  2: "Light / Recovery",
  3: "Moderate / Easy pace",
  4: "Comfortable steady",
  5: "Challenging aerobic",
  6: "Moderately hard",
  7: "Hard / Target effort",
  8: "Very hard / 2 reps left",
  9: "Near maximal / 1 rep left",
  10: "Absolute failure",
};

const INTENSITY = [40, 60, 85, 100, 95, 55];

/** S17 Workout complete — Stitch lavender metrics + RPE grid; keep RPE save. */
export const CompleteScreen = () => {
  const workoutTitle = useWorkoutStore((s) => s.workoutTitle);
  const kcal = useWorkoutStore((s) => s.kcal);
  const exercises = useWorkoutStore((s) => s.exercises);
  const rpe = useWorkoutStore((s) => s.rpe);
  const durationMin = useWorkoutStore((s) => s.durationMin);
  const setRpe = useWorkoutStore((s) => s.setRpe);
  const reset = useWorkoutStore((s) => s.reset);
  const weekDays = useTodayStore((s) => s.weekDays);
  const dayIndex = useTodayStore((s) => s.dayIndex);

  const minutes =
    durationMin ||
    Math.max(1, Math.round(useWorkoutStore.getState().elapsedSec() / 60));
  const nextDay =
    weekDays[dayIndex + 1] ?? weekDays.find((d, i) => i > dayIndex && d.workout);
  const nextLabel = nextDay?.workout?.title
    ? `Next lift: ${nextDay.workout.title} (${nextDay.date})`
    : "Next session will appear when your plan updates.";
  const recovery =
    rpe != null && rpe >= 8
      ? "48–72 hours"
      : rpe != null && rpe >= 5
        ? "36–48 hours"
        : "24–36 hours";
  const volumeKg = Math.max(1, exercises.length * 1400);

  const handleDone = () => {
    void useWorkoutStore.getState().finish().finally(() => {
      reset();
      router.replace("/(tabs)/today");
    });
  };

  return (
    <ScreenScroll dockPad={false}>
      <View style={sx("mb-space-lg flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={handleDone}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <Text style={sx("font-headline-sm text-headline-sm uppercase text-on-surface")}>
          Workout Complete
        </Text>
        <View style={sx("w-11")} />
      </View>

      <View style={sx("mb-space-lg items-center")}>
        <View style={sx("mb-3 h-16 w-16 items-center justify-center rounded-full bg-primary-fixed")}>
          <Check size={32} color={color.onPrimaryFixed} strokeWidth={3} />
        </View>
        <Text style={sx("font-headline text-headline-lg uppercase text-on-surface")}>
          Session Logged
        </Text>
        <Text style={sx("mt-1 font-body text-body-md text-on-surface-variant")}>
          {workoutTitle || "Session"} completed.
        </Text>
      </View>

      <View style={sx("mb-space-md overflow-hidden rounded-lg bg-secondary p-space-lg")}>
        <View style={sx("mb-space-md flex-row items-center justify-between")}>
          <View style={sx("flex-row items-center gap-1.5 rounded-full bg-on-secondary-fixed px-3 py-1")}>
            <Text style={sx("font-label text-label-md text-secondary")}>
              🔥 {kcal} kcal burned
            </Text>
          </View>
          <CapsLabel tone="dark">Session</CapsLabel>
        </View>
        <View style={sx("flex-row gap-2 py-2")}>
          <Metric value={String(minutes)} label="MINUTES" />
          <Metric
            value={volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1)}k` : String(volumeKg)}
            label="KG VOLUME"
          />
          <Metric
            value={String(exercises.length).padStart(2, "0")}
            label="EXERCISES"
          />
        </View>
        <View style={sx("mt-space-md gap-2 border-t border-on-secondary-fixed/15 pt-space-sm")}>
          <View style={sx("flex-row items-center justify-between")}>
            <Text style={sx("font-label text-label-caps text-on-secondary-fixed/80")}>
              Set Intensity Curve
            </Text>
            <Text style={sx("font-label text-label-caps text-on-secondary-fixed/80")}>
              Target Hit {rpe != null ? `${Math.min(99, 70 + rpe * 3)}%` : "—"}
            </Text>
          </View>
          <View style={sx("h-11 flex-row items-end gap-1.5")}>
            {INTENSITY.map((h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 999,
                  backgroundColor:
                    h >= 90
                      ? color.onSecondaryFixed
                      : `rgba(33,20,58,${0.2 + h / 200})`,
                }}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={sx("mb-space-md rounded-lg bg-surface-container p-space-lg")}>
        <View style={sx("mb-1 flex-row items-center justify-between")}>
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
            How hard was it?
          </Text>
          <CapsLabel tone="lime">RPE Scale</CapsLabel>
        </View>
        <Text style={sx("mb-space-md font-body text-body-sm text-on-surface-variant")}>
          Mirra uses this to calibrate recovery &amp; next session load.
        </Text>
        <View style={sx("flex-row flex-wrap justify-between gap-y-2")}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const selected = rpe === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`RPE ${n}`}
                accessibilityState={{ selected }}
                onPress={() => setRpe(n)}
                style={{
                  width: "18%",
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  backgroundColor: selected
                    ? color.primaryFixed
                    : color.surfaceContainerHigh,
                }}
              >
                <Text
                  style={sx(
                    `font-headline-sm text-headline-sm ${
                      selected ? "text-on-primary-fixed" : "text-on-surface"
                    }`,
                  )}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={sx("mt-space-sm flex-row items-center justify-between")}>
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>
            Light recovery
          </Text>
          <Text style={sx("font-label text-label-md text-primary-fixed")}>
            {rpe != null ? RPE_LABELS[rpe] : "Tap RPE"}
          </Text>
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>
            Max failure
          </Text>
        </View>
      </View>

      <View style={sx("mb-space-lg flex-row items-start gap-3.5 rounded-lg bg-surface-container-low p-space-md")}>
        <View style={sx("mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-secondary/15")}>
          <Clock3 size={20} color={color.secondary} />
        </View>
        <View style={sx("flex-1")}>
          <Text style={sx("font-label text-label-lg text-on-surface")}>
            Recovery projected: {recovery}
          </Text>
          <Text style={sx("mt-0.5 font-body text-body-sm text-on-surface-variant")}>
            {nextLabel}
          </Text>
        </View>
      </View>

      <LimeCta label="Done" onPress={handleDone} />
    </ScreenScroll>
  );
};

const Metric = ({ value, label }: { value: string; label: string }) => (
  <View style={sx("flex-1")}>
    <Text style={sx("font-display text-display-metric leading-none text-on-secondary-fixed")}>
      {value}
    </Text>
    <Text style={sx("mt-1 font-label text-label-md text-on-secondary-fixed/70")}>
      {label}
    </Text>
  </View>
);
