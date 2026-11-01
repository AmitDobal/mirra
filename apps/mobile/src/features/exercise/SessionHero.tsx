import { Clock, Play, Zap } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { s25ExerciseHub } from "../../../assets/stitch";
import { ScrimGradient } from "@/features/checkin/ScrimGradient";
import type { PlanWorkout } from "@/lib/api";
import { color, font, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

type Props = {
  readonly workout: PlanWorkout | null;
  /** 1-based day number inside the week plan, when known. */
  readonly dayNumber: number | null;
  /** False when a past/future plan day is selected (copy only). */
  readonly isToday?: boolean;
  readonly onStart: () => void;
};

/** S25 "Today's session" hero: photo, focus + duration chips, title, Start Workout. */
export const SessionHero = ({ workout, dayNumber, isToday = true, onStart }: Props) => {
  const exercises = workout?.exercises ?? [];
  const totalSets = exercises.reduce((sum, e) => sum + e.targetSets, 0);

  return (
    <View style={styles.card}>
      <Image source={s25ExerciseHub.hero} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <ScrimGradient id="exercise-hub-hero" />
      <View style={styles.top}>
        <View style={styles.chip}>
          <Zap size={12} color={color.primaryFixed} fill={color.primaryFixed} />
          <Text style={styles.chipLime} numberOfLines={1}>
            {workout ? workout.focus?.trim() || "Strength" : "Recovery"}
          </Text>
        </View>
        {workout ? (
          <View style={styles.chip}>
            <Clock size={12} color={color.onSurface} />
            <Text style={styles.chipText}>{workout.durationMin} min</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <CapsLabel>{dayNumber ? `This week · Day ${dayNumber}` : "This week"}</CapsLabel>
        <Text style={styles.title} numberOfLines={2}>
          {workout?.title ?? "Rest / recovery"}
        </Text>
        <Text style={styles.meta}>
          {workout
            ? `${exercises.length} movements · ${totalSets} sets total`
            : `No lifts scheduled ${isToday ? "today" : "this day"}. Browse the library below.`}
        </Text>
        {workout && exercises.length > 0 ? (
          <LimeCta
            label="Start Workout"
            onPress={onStart}
            style={styles.cta}
            icon={<Play size={16} color={color.onPrimaryFixed} fill={color.onPrimaryFixed} />}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 268,
    overflow: "hidden",
    justifyContent: "space-between",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "70%",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(19,19,19,0.8)",
  },
  chipLime: { flexShrink: 1, fontFamily: font.label, fontSize: 12, color: color.primaryFixed },
  chipText: { fontFamily: font.label, fontSize: 12, color: color.onSurface },
  bottom: { padding: space.md, gap: 4 },
  title: { fontFamily: font.headline, fontSize: 28, lineHeight: 34, color: color.onSurface },
  meta: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  cta: { marginTop: space.sm, height: 52 },
});
