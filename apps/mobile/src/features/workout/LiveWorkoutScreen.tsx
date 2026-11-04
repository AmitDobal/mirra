import { router } from "expo-router";
import { CheckCircle2, Flame, Heart, Pause, Play, SkipForward, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  TouchableWithoutFeedback,
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

import { formatLoad, fromDisplayLoad, loadLabel, loadStepKg, toDisplayLoad } from "./load-units";
import { formatClock, HudChip, Stat, TextLink } from "./HudParts";
import { SetChips } from "./SetChips";
import { SetStepper } from "./SetStepper";
import { useExerciseScoring, useLoadUnit } from "./use-load-units";
import { useOpenTiming } from "./use-open-timing";
import { useWorkoutStore } from "./workout-store";
import { sx } from "@/theme/sx";

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

  useOpenTiming();
  const [, setTick] = useState(0);
  const restTargetSec = exercises[exerciseIndex]?.restSec ?? 90;
  const [restLeft, setRestLeft] = useState(restTargetSec);

  // `finish()` stamps `finished` synchronously: leave for S17 now, the complete
  // (tier changes) lands there when the network returns.
  useEffect(() => {
    if (!finished) return;
    void useWorkoutStore.getState().finish();
    router.replace("/workout/complete");
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
  const unit = useLoadUnit();
  // Bodyweight lifts log added load: "+ kg added" / "+ lb added".
  const scoring = useExerciseScoring(ex);
  const elapsed = formatClock(useWorkoutStore.getState().elapsedSec());
  const rest = formatClock(restLeft);
  const resting = restLeft > 0 && restLeft < restTargetSec;

  const handleClose = () => router.back();
  const handleFinish = () => void useWorkoutStore.getState().finish();
  const handleLog = () => {
    Keyboard.dismiss();
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
      {/* Keyboard up: the flex card shrinks so steppers + Log stay above it. Edge-to-edge
          Android does not resize the window, so pad on both platforms. Tap outside = dismiss. */}
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <View style={sx("mb-space-md flex-row items-center justify-between")}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close workout"
              onPress={handleClose}
              style={sx(
                "h-11 w-11 items-center justify-center rounded-full bg-surface-container-high",
              )}
            >
              <X size={22} color={color.onSurface} />
            </Pressable>
            <CapsLabel tone="lime">{paused ? "Paused" : "Mirra Live"}</CapsLabel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? "Resume" : "Pause"}
              onPress={togglePause}
              style={sx(
                "h-11 w-11 items-center justify-center rounded-full bg-surface-container-high",
              )}
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
            <HudChip
              Icon={Heart}
              value={`${sets.filter((s) => s.done).length} DONE`}
              label="SETS"
            />
          </View>

          <View
            style={[
              sx(
                "mb-space-sm flex-1 justify-center rounded-lg bg-surface-container-low p-space-lg",
              ),
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
              formatLoad={(kg) => formatLoad(kg, unit)}
              sets={sets}
              setIndex={setIndex}
              editingSet={editingSet}
              targetReps={ex?.targetReps ?? "—"}
              onSelect={selectSet}
            />
          </View>

          <View style={sx("mb-space-sm flex-row gap-space-sm")}>
            <SetStepper
              label={loadLabel(unit, scoring)}
              unit={unit === "kg" ? "kilograms" : "pounds"}
              value={toDisplayLoad(draft.weightKg, unit)}
              onStep={(dir) => adjustDraft("weightKg", dir * loadStepKg(unit))}
              onCommit={(v) => setDraftValue("weightKg", fromDisplayLoad(v, unit))}
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenFixed>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
