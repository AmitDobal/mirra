import { ChevronRight, Lightbulb, PlusCircle } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { PlanExercise } from "@/lib/api";
import { color, font, radius, space } from "@/theme/tokens";

import { entryForPlanExercise, thumbSource } from "./catalog";

type Props = {
  readonly exercises: readonly PlanExercise[];
  readonly onOpen: (exercise: PlanExercise) => void;
  readonly onAdd: () => void;
};

const loadLabel = (e: PlanExercise): string =>
  e.targetLoadKg != null && e.targetLoadKg > 0 ? `${e.targetLoadKg} kg target load` : "Set load in workout";

/** S25 "Today's Protocol": numbered rows with thumb, load, coach cue and sets×reps pill. */
export const ProtocolList = ({ exercises, onOpen, onAdd }: Props) => (
  <View style={styles.list}>
    {exercises.map((e, i) => {
      const entry = entryForPlanExercise(e);
      const cue = e.cue?.trim() || entry.cue;
      return (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${e.name}`}
          onPress={() => onOpen(e)}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
        >
          <View style={styles.thumbWrap}>
            <Image source={thumbSource(entry.thumb)} style={styles.thumb} resizeMode="cover" />
            <View style={styles.index}>
              <Text style={styles.indexText}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {e.name}
              </Text>
              <View style={styles.sets}>
                <Text style={styles.setsText}>
                  {e.targetSets} × {e.targetReps}
                </Text>
              </View>
            </View>
            <Text style={styles.load}>{loadLabel(e)}</Text>
            <View style={styles.cueRow}>
              <Lightbulb size={11} color={color.secondary} />
              <Text style={styles.cue} numberOfLines={1}>
                {cue}
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={color.onSurfaceVariant} />
        </Pressable>
      );
    })}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a custom exercise to today"
      onPress={onAdd}
      style={({ pressed }) => [styles.add, pressed ? styles.pressed : null]}
    >
      <PlusCircle size={16} color={color.primaryFixed} />
      <Text style={styles.addText}>Add Exercise to Today</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  list: { gap: 10 },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  thumbWrap: { width: 56, height: 56, borderRadius: radius.sm, overflow: "hidden" },
  thumb: { width: 56, height: 56, backgroundColor: color.surfaceContainerHigh },
  index: {
    position: "absolute",
    right: 3,
    bottom: 3,
    borderRadius: 4,
    paddingHorizontal: 4,
    backgroundColor: "rgba(19,19,19,0.8)",
  },
  indexText: { fontFamily: font.labelBold, fontSize: 9, color: color.onSurface },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontFamily: font.headlineSemi, fontSize: 14, lineHeight: 18, color: color.onSurface },
  sets: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: color.onPrimaryFixedVariant,
  },
  setsText: { fontFamily: font.labelBold, fontSize: 11, color: color.primaryFixed },
  load: { fontFamily: font.bodyMedium, fontSize: 12, color: color.onSurfaceVariant },
  cueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cue: { flex: 1, fontFamily: font.body, fontSize: 11, color: color.onSurfaceVariant },
  add: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.outline,
    marginTop: space.xs,
  },
  addText: { fontFamily: font.labelBold, fontSize: 12, color: color.onSurface },
});
