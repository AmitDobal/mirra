import { ChevronRight, Play, Utensils } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { s15Today } from "../../../assets/stitch";
import { adjustedMinutes, useTodayAdjustStore } from "@/features/checkin/adjust-store";
import type { PlanExercise, PlanWorkout } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { useTodayStore } from "./today-store";

const MAX_ROWS = 6;

type Props = {
  readonly workout: PlanWorkout | null;
  readonly onStart: () => void;
  readonly onSwap: () => void;
  readonly onOpenExercise: (exerciseId: string) => void;
  readonly onAskCoach?: () => void;
  readonly onLongPressExercise?: (exercise: PlanExercise) => void;
  readonly onAddExercise?: () => void;
};

/** S15 Primary Scheduled Workout Card — hero image + routine hub. */
export const RoutineCard = ({
  workout,
  onStart,
  onSwap,
  onOpenExercise,
  onAskCoach,
  onLongPressExercise,
  onAddExercise,
}: Props) => {
  const exercises = workout?.exercises ?? [];
  const adjustment = useTodayAdjustStore((s) => s.adjustment);
  const todayDate = useTodayStore((s) => s.date);
  const minutes = adjustedMinutes(adjustment, todayDate, workout?.durationMin ?? 0);
  const preview = exercises
    .slice(0, 4)
    .map((e) => e.name)
    .join(", ");
  const focusTag = workout?.focus?.trim() || "Hypertrophy";

  return (
    <View style={sx("mb-space-md overflow-hidden rounded-[24px] bg-surface-container-high")}>
      <View style={sx("relative h-44 w-full overflow-hidden bg-surface-container-highest")}>
        <Image
          source={s15Today.trainerSquat}
          accessibilityLabel="Today's workout"
          style={{ width: "100%", height: 176 }}
          resizeMode="cover"
        />
        <View
          pointerEvents="none"
          style={sx("absolute inset-0 bg-surface-container-high/40")}
        />
        <View style={sx("absolute left-space-md right-space-md top-space-md flex-row items-center justify-between")}>
          <View style={sx("rounded-full bg-surface-dim/80 px-3 py-1")}>
            <CapsLabel tone="lime">{focusTag}</CapsLabel>
          </View>
          <View style={sx("rounded-full bg-primary px-3 py-1")}>
            <Text style={sx("font-label-bold text-label-md text-on-primary")}>
              {minutes} mins
            </Text>
          </View>
        </View>
      </View>

      <View style={sx("relative z-10 -mt-4 gap-space-md p-space-lg")}>
        <View style={sx("gap-1")}>
          <View style={sx("flex-row items-center gap-2")}>
            <CapsLabel tone="lime">Today&apos;s Routine</CapsLabel>
            <View style={sx("h-1 w-1 rounded-full bg-outline")} />
            <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
              {exercises.length} movements
            </Text>
          </View>
          <Text style={sx("font-headline text-headline-md text-on-surface")}>
            {workout?.title ?? "Rest / recovery"}
          </Text>
          {preview ? (
            <Text
              numberOfLines={2}
              style={sx("font-body text-body-sm text-on-surface-variant")}
            >
              {preview}
            </Text>
          ) : (
            <Text style={sx("font-body text-body-md text-on-surface-variant")}>
              No lifts scheduled for this day
            </Text>
          )}
        </View>

        <View style={sx("flex-row flex-wrap gap-1.5")}>
          {workout?.focus ? (
            <View style={sx("rounded-full bg-surface-container-highest px-2.5 py-1")}>
              <Text style={sx("font-label text-label-md text-on-surface")}>
                {workout.focus}
              </Text>
            </View>
          ) : null}
          <View style={sx("rounded-full bg-surface-container-highest px-2.5 py-1")}>
            <Text style={sx("font-label text-label-md text-on-surface-variant")}>
              {exercises.length} exercises
            </Text>
          </View>
        </View>

        <View style={sx("flex-row items-center gap-space-md")}>
          {onAskCoach ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask coach to adjust this workout"
              onPress={onAskCoach}
              style={sx("flex-row items-center gap-1.5")}
            >
              <AiBadge label={false} tone="lime" size={16} />
              <CapsLabel tone="lime">Ask coach</CapsLabel>
            </Pressable>
          ) : null}
          {onAddExercise && workout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add exercise to this workout"
              onPress={onAddExercise}
            >
              <CapsLabel tone="lime">Add exercise</CapsLabel>
            </Pressable>
          ) : null}
        </View>

        {exercises.slice(0, MAX_ROWS).map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${e.name} in live workout`}
            onPress={() => onOpenExercise(e.id)}
            onLongPress={onLongPressExercise ? () => onLongPressExercise(e) : undefined}
            style={({ pressed }) => [
              sx("flex-row items-center justify-between py-space-xs"),
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text
              style={sx("flex-1 font-body-medium text-body-md text-on-surface")}
              numberOfLines={1}
            >
              {e.name}
            </Text>
            <Text style={sx("mr-space-sm font-body text-body-sm text-on-surface-variant")}>
              {e.targetSets}×{e.targetReps}
            </Text>
            <ChevronRight size={18} color={color.onSurfaceVariant} />
          </Pressable>
        ))}

        <View style={sx("flex-row items-center gap-space-sm pt-space-xs")}>
          <LimeCta
            label="Start Workout"
            onPress={onStart}
            style={sx("flex-1")}
            icon={<Play size={18} color={color.onPrimaryFixed} fill={color.onPrimaryFixed} />}
          />
          <LimeCta label="Swap" onPress={onSwap} variant="dark" style={sx("px-space-md")} />
        </View>
      </View>
    </View>
  );
};

/** S15 bottom calorie strip (optional reuse). */
export const FuelLogStrip = ({
  logged,
  target,
  left,
  over,
  overBy,
  onLog,
}: {
  readonly logged: number;
  readonly target: number;
  readonly left: number;
  readonly over: boolean;
  readonly overBy: number;
  readonly onLog: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Log meal"
    onPress={onLog}
    style={sx("flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md")}
  >
    <View style={sx("flex-row items-center gap-space-md")}>
      <View style={sx("h-11 w-11 items-center justify-center rounded-full bg-secondary/15")}>
        <Utensils size={22} color={color.secondary} />
      </View>
      <View>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
          {logged} / {target || "—"}
        </Text>
        <Text
          style={sx(
            `font-body text-body-sm ${over ? "text-error" : "text-on-surface-variant"}`,
          )}
        >
          {over
            ? `OVER by ${overBy} kcal`
            : `Calories logged · ${left} kcal remaining`}
        </Text>
      </View>
    </View>
    <View style={sx("h-10 w-10 items-center justify-center rounded-full bg-surface-container-high")}>
      <Text style={sx("font-headline text-headline-sm text-on-surface")}>+</Text>
    </View>
  </Pressable>
);
