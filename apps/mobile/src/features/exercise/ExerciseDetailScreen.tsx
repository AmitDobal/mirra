import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeftRight, ArrowRight, Star, X } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScrimGradient } from "@/features/checkin/ScrimGradient";
import { useTodayStore } from "@/features/today/today-store";
import { useWorkoutStore } from "@/features/workout/workout-store";
import { color, font, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import {
  entryForPlanExercise,
  findCatalogById,
  findCatalogByName,
  heroSource,
} from "./catalog";
import { CoachCue, MuscleBars, PrescriptionCard, StepsList } from "./DetailParts";
import { TagChip } from "./ExercisePills";
import { useExerciseSheet } from "./use-exercise-sheet";
import { useNotice } from "./use-notice";

/** S26 Exercise detail — hero, tags, prescription, cue, HOW TO steps, Swap / Add bar. */
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

  const exercises = workout?.exercises ?? [];
  const fromId = exerciseId ? exercises.find((e) => e.id === exerciseId) : undefined;
  const entry = fromId
    ? entryForPlanExercise(fromId)
    : catalogId
      ? findCatalogById(catalogId)
      : undefined;
  const inSession =
    fromId ?? (entry ? exercises.find((e) => findCatalogByName(e.name)?.id === entry.id) : undefined);

  if (!entry) {
    return (
      <View style={[styles.root, styles.missing, { paddingTop: insets.top + space.lg }]}>
        <Text style={styles.title}>Exercise not found</Text>
        <LimeCta label="Back" onPress={() => router.back()} style={styles.missingBtn} />
      </View>
    );
  }

  const handleStartLift = () => {
    if (!inSession) return;
    void openExercise(workout, inSession.id).then(() => router.push("/workout/live"));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.sm,
          paddingBottom: 120 + insets.bottom,
          paddingHorizontal: space.margin,
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <X size={18} color={color.onSurface} />
          </Pressable>
          <View style={styles.crumb}>
            <View style={styles.dot} />
            <Text style={styles.crumbText}>MIRRA PROTOCOL · LIFT HUB</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.hero}>
          <Image
            source={heroSource(entry)}
            style={styles.heroImg}
            resizeMode="cover"
          />
          <ScrimGradient id="exercise-detail-hero" />
          <View style={styles.heroBadge}>
            <Star size={11} color={color.primaryFixed} fill={color.primaryFixed} />
            <Text style={styles.heroBadgeText}>Form guide</Text>
          </View>
        </View>

        <View style={styles.headBlock}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <CapsLabel tone="lime">{inSession ? "In today's session" : "Library movement"}</CapsLabel>
          </View>
          <Text style={styles.title}>{entry.name}</Text>
          <View style={styles.tags}>
            <TagChip label={entry.muscle} />
            <TagChip label={entry.equipment} />
            <TagChip label={entry.level} tone="lavender" />
            <TagChip label={entry.kind} tone="lime" />
          </View>
        </View>

        <PrescriptionCard
          sets={inSession?.targetSets ?? entry.sets}
          reps={inSession?.targetReps ?? entry.reps}
          loadKg={inSession?.targetLoadKg ?? null}
          restSec={inSession?.restSec ?? entry.restSec}
          caption={inSession ? "Today" : "Suggested"}
        />
        <CoachCue cue={inSession?.cue?.trim() || entry.cue} />
        <StepsList steps={entry.steps} />
        <MuscleBars muscles={entry.muscles} />
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
  missing: { alignItems: "center", justifyContent: "center", gap: space.md },
  missingBtn: { alignSelf: "stretch", marginHorizontal: space.margin },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerHigh,
  },
  iconSpacer: { width: 40 },
  crumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: color.surfaceContainerLow,
  },
  crumbText: { fontFamily: font.label, fontSize: 10, letterSpacing: 0.8, color: color.onSurface },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed },
  hero: {
    height: 176,
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  heroImg: { width: "100%", height: "100%" },
  heroBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(19,19,19,0.8)",
  },
  heroBadgeText: { fontFamily: font.labelBold, fontSize: 10, letterSpacing: 0.6, color: color.primaryFixed },
  headBlock: { gap: 8 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: font.headline, fontSize: 28, lineHeight: 34, color: color.onSurface },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
