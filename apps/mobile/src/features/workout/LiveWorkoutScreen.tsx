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
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { s16LiveWorkoutHud } from "../../../assets/stitch";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenFixed } from "@/ui/ScreenScroll";
import { color, space } from "@/theme/tokens";

import { SetChips } from "./SetChips";
import { SetStepper } from "./SetStepper";
import { useWorkoutStore } from "./workout-store";
import { sx } from "@/theme/sx";

const WEIGHT_STEP_KG = 2.5;
const REPS_STEP = 1;

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
  const draft = useWorkoutStore((s) => s.draft);
  const editingSet = useWorkoutStore((s) => s.editingSet);
  const logSet = useWorkoutStore((s) => s.logSet);
  const adjustDraft = useWorkoutStore((s) => s.adjustDraft);
  const setDraftValue = useWorkoutStore((s) => s.setDraftValue);
  const selectSet = useWorkoutStore((s) => s.selectSet);
  const togglePause = useWorkoutStore((s) => s.togglePause);
  const skipExercise = useWorkoutStore((s) => s.skipExercise);
  const swapExercise = useWorkoutStore((s) => s.swapExercise);

  const [, setTick] = useState(0);
  const restTargetSec = exercises[exerciseIndex]?.restSec ?? 90;
  const [restLeft, setRestLeft] = useState(restTargetSec);

  useEffect(() => {
    if (finished) {
      void useWorkoutStore.getState().finish().then(() => {
        router.replace("/workout/complete");
      });
    }
  }, [finished]);

  // New exercise → reset rest prescription.
  useEffect(() => {
    setRestLeft(restTargetSec);
  }, [restTargetSec, exerciseIndex]);

  // Elapsed + rest countdown tick together while running.
  useEffect(() => {
    if (!startedAt || paused || finished) return;
    const id = setInterval(() => {
      setTick((n) => n + 1);
      setRestLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, paused, finished]);

  const ex = exercises[exerciseIndex];
  const elapsed = formatClock(useWorkoutStore.getState().elapsedSec());
  const rest = formatClock(restLeft);
  const resting = restLeft > 0 && restLeft < restTargetSec;

  const handleClose = () => router.back();
  const handleFinish = () => {
    void useWorkoutStore.getState().finish().then(() => {
      router.replace("/workout/complete");
    });
  };
  const handleLog = () => {
    void logSet();
    // After a set: start the prescribed rest countdown.
    setRestLeft(restTargetSec);
  };
  const logLabel = paused
    ? "Resume to log"
    : editingSet !== null
      ? `Update Set ${editingSet}`
      : `Log Set ${setIndex}`;

  const { width: windowWidth } = useWindowDimensions();
  const heroWidth = windowWidth - space.margin * 2 - space.lg * 2;

  return (
    <ScreenFixed>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close workout"
          onPress={handleClose}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel tone="lime">{paused ? "Paused" : "Mirra Live"}</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? "Resume" : "Pause"}
          onPress={togglePause}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          {paused ? (
            <Play size={20} color={color.onSurface} fill={color.onSurface} />
          ) : (
            <Pause size={20} color={color.onSurface} />
          )}
        </Pressable>
      </View>

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <HudChip Icon={Flame} value={`${kcal} KCAL`} />
        <HudChip Icon={Heart} value={`${sets.filter((s) => s.done).length} DONE`} label="SETS" />
      </View>

      <View
        style={[
          sx("mb-space-sm flex-1 justify-center rounded-lg bg-surface-container-low p-space-lg"),
          styles.card,
        ]}
      >
        <Image
          source={s16LiveWorkoutHud.athleteDeepSquat}
          accessibilityLabel="Live exercise"
          style={[styles.hero, { width: heroWidth }]}
          resizeMode="cover"
        />
        <CapsLabel>
          Exercise {exerciseIndex + 1} of {exercises.length}
        </CapsLabel>
        <Text style={sx("mt-1 font-body-medium text-body-md text-on-surface-variant")}>
          {ex?.cue ?? workoutTitle}
        </Text>
        <Text style={sx("mt-space-sm font-headline text-headline-lg text-on-surface")}>
          {ex?.name ?? "Movement"}
        </Text>
        <View style={sx("mt-space-lg flex-row justify-between")}>
          <Stat label="Elapsed" value={elapsed} />
          <Stat
            label={restLeft === 0 ? "Rest done" : resting ? "Resting" : "Rest Target"}
            value={rest}
          />
          <Stat label="Current Set" value={`${setIndex}`} sub={`/ ${sets.length}`} />
        </View>
        <View style={sx("mt-space-lg rounded-lg bg-surface-container-high p-space-md")}>
          <CapsLabel>Target Load Track</CapsLabel>
          <Text style={sx("mt-1 font-headline-sm text-headline-sm text-primary-fixed")}>
            {ex?.targetReps ?? "—"} REPS · {sets.length} SETS
          </Text>
        </View>
        <SetChips
          sets={sets}
          setIndex={setIndex}
          editingSet={editingSet}
          targetReps={ex?.targetReps ?? "—"}
          onSelect={selectSet}
        />
      </View>

      <View style={sx("mb-space-sm flex-row gap-space-sm")}>
        <SetStepper
          label="KG"
          unit="kilograms"
          value={draft.weightKg}
          onStep={(dir) => adjustDraft("weightKg", dir * WEIGHT_STEP_KG)}
          onCommit={(v) => setDraftValue("weightKg", v)}
          disabled={paused}
        />
        <SetStepper
          label="REPS"
          unit="reps"
          value={draft.reps}
          onStep={(dir) => adjustDraft("reps", dir * REPS_STEP)}
          onCommit={(v) => setDraftValue("reps", v)}
          disabled={paused}
        />
      </View>
      <LimeCta
        label={logLabel}
        onPress={paused ? togglePause : handleLog}
        icon={<CheckCircle2 size={20} color={color.onPrimaryFixed} />}
      />
      <View style={sx("mt-space-md flex-row items-center justify-between px-space-sm")}>
        <TextLink label="Swap exercise" onPress={swapExercise} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip exercise"
          onPress={skipExercise}
          style={sx("flex-row items-center gap-1")}
        >
          <SkipForward size={16} color={color.onSurfaceVariant} />
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>Skip</Text>
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
  <View style={sx("flex-1 flex-row items-center gap-space-sm rounded-lg bg-surface-container-high px-space-md py-space-sm")}>
    <Icon size={18} color={color.primaryFixed} />
    <View>
      {label ? <CapsLabel>{label}</CapsLabel> : null}
      <Text style={sx("font-label-bold text-label-lg text-on-surface")}>{value}</Text>
    </View>
  </View>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View>
    <CapsLabel>{label}</CapsLabel>
    <View style={sx("flex-row items-baseline gap-1")}>
      <Text style={sx("font-headline text-headline-md text-on-surface")}>{value}</Text>
      {sub ? (
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{sub}</Text>
      ) : null}
    </View>
  </View>
);

const TextLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
    <Text style={sx("font-label text-label-md text-on-surface-variant")}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  hero: {
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: color.surfaceContainerHigh,
  },
});
