import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeftRight, ArrowRight } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScrimGradient } from "@/features/checkin/ScrimGradient";
import { useTodayStore } from "@/features/today/today-store";
import { useLoadUnit } from "@/features/workout/use-load-units";
import { useWorkoutStore } from "@/features/workout/workout-store";
import { color, font, space } from "@/theme/tokens";
import { LimeCta } from "@/ui/LimeCta";

import {
  entryForPlanExercise,
  findCatalogById,
  findCatalogByName,
  heroSource,
} from "./catalog";
import { DetailHead, DetailHero } from "./DetailHero";
import { CoachCue, MuscleBars, PrescriptionCard, StepsList } from "./DetailParts";
import { ExerciseAnatomySection } from "./ExerciseAnatomySection";
import { ExerciseTierCard } from "./ExerciseTierCard";
import { primaryMuscleLabel } from "./exercise-muscles";
import { useExerciseDetail } from "./use-exercise-detail";
import { useExerciseSheet } from "./use-exercise-sheet";
import { useNotice } from "./use-notice";

/**
 * S36 Exercise detail (anatomy v2): hero, tags, prescription, muscles worked
 * (front + back anatomy), your tier, execution protocol, cue, muscle bars, Swap / Add bar.
 */
export const ExerciseDetailScreen = () => {
  const { exerciseId, catalogId } = useLocalSearchParams<{
    exerciseId?: string;
    catalogId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const workout = useTodayStore((s) => s.workout);
  const openExercise = useWorkoutStore((s) => s.openExercise);
  const { notice, show } = useNotice();
  const { openSwap, addEntry, sheet } = useExerciseSheet(workout, show);
  const profileUnit = useLoadUnit();

  const exercises = workout?.exercises ?? [];
  const fromId = exerciseId ? exercises.find((e) => e.id === exerciseId) : undefined;
  const entry = fromId
    ? entryForPlanExercise(fromId)
    : catalogId
      ? findCatalogById(catalogId)
      : undefined;
  const inSession =
    fromId ?? (entry ? exercises.find((e) => findCatalogByName(e.name)?.id === entry.id) : undefined);
  const { muscles, strength } = useExerciseDetail(inSession, entry);

  if (!entry) {
    return (
      <View style={[styles.root, styles.missing, { paddingTop: insets.top + space.lg }]}>
        <Text style={styles.missingTitle}>Exercise not found</Text>
        <LimeCta label="Back" onPress={() => router.back()} style={styles.missingBtn} />
      </View>
    );
  }

  const handleStartLift = () => {
    if (!inSession) return;
    void openExercise(workout, inSession.id).then(() => router.push("/workout/live"));
  };

  const unit =
    strength.status === "ready" ? (strength.data.units === "imperial" ? "lb" : "kg") : profileUnit;
  const isCustom = entry.level === "Custom";
  const muscleChip = primaryMuscleLabel(muscles.focus) ?? (isCustom ? null : entry.muscle);
  const chips = [
    ...(muscleChip ? [muscleChip] : []),
    ...(isCustom ? [] : [entry.equipment, entry.level]),
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <DetailHero source={heroSource(entry)} name={entry.name} />
        <View style={styles.body}>
          <DetailHead
            eyebrow={inSession ? "Primary movement" : "Library movement"}
            name={entry.name}
            chips={chips}
          />
          <PrescriptionCard
            sets={inSession?.targetSets ?? entry.sets}
            reps={inSession?.targetReps ?? entry.reps}
            loadKg={inSession?.targetLoadKg ?? null}
            restSec={inSession?.restSec ?? entry.restSec}
            unit={unit}
          />
          <ExerciseAnatomySection muscles={muscles.focus} />
          <ExerciseTierCard strength={strength} />
          <StepsList steps={entry.steps} />
          <CoachCue cue={inSession?.cue?.trim() || entry.cue} />
          <MuscleBars muscles={muscles.bars} />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <ScrimGradient id="exercise-detail-dock" variant="dock" />
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </Text>
        ) : null}
        <View style={styles.barRow}>
          {inSession ? (
            <>
              <LimeCta
                label="Swap"
                variant="dark"
                onPress={() => openSwap(inSession)}
                style={styles.swapBtn}
                icon={<ArrowLeftRight size={16} color={color.onSurface} />}
              />
              <LimeCta
                label="Start lift"
                onPress={handleStartLift}
                style={styles.flex1}
                icon={<ArrowRight size={16} color={color.onPrimaryFixed} />}
              />
            </>
          ) : (
            <LimeCta
              label="Add to session"
              onPress={() => void addEntry(entry)}
              style={styles.flex1}
              icon={<ArrowRight size={16} color={color.onPrimaryFixed} />}
            />
          )}
        </View>
      </View>
      {sheet}
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  root: { flex: 1, backgroundColor: color.surface },
  body: { paddingHorizontal: space.margin, paddingTop: space.lg, gap: space.lg },
  missing: { alignItems: "center", justifyContent: "center", gap: space.md },
  missingTitle: { fontFamily: font.headline, fontSize: 28, lineHeight: 34, color: color.onSurface },
  missingBtn: { alignSelf: "stretch", marginHorizontal: space.margin },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.lg,
    paddingHorizontal: space.margin,
    gap: 8,
  },
  notice: { textAlign: "center", fontFamily: font.bodyMedium, fontSize: 12, color: color.primaryFixed },
  barRow: { flexDirection: "row", gap: 12 },
  swapBtn: { paddingHorizontal: space.lg },
});
