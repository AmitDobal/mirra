import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { PlanExercise } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { exercisePhoto } from "./exercise-photo";
import { pressFeedback } from "./press-style";

export const EXERCISE_TAB = "/(tabs)/exercise";

const MAX_CARDS = 5;

type Props = {
  readonly exercises: readonly PlanExercise[];
  /** Long-press a card to edit / remove (existing routine edit sheet). */
  readonly onLongPressExercise?: (exercise: PlanExercise) => void;
};

const detail = (e: PlanExercise): string => {
  const load = e.targetLoadKg ? ` · ${e.targetLoadKg}kg` : "";
  return `${e.targetSets} sets${load}`;
};

/** S15c routine teaser: horizontal exercise cards that route to the Exercise tab. */
export const ExerciseTeaserRow = ({ exercises, onLongPressExercise }: Props) => {
  if (exercises.length === 0) return null;
  const open = () => router.push(EXERCISE_TAB);

  return (
    <View style={sx("mb-space-md")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <Text style={sx("font-headline text-headline-sm text-on-surface")}>Today&apos;s Routine</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Exercise tab"
          onPress={open}
          style={sx("flex-row items-center gap-1")}
        >
          <CapsLabel tone="lime">Open Exercise</CapsLabel>
          <ArrowRight size={14} color={color.primaryFixed} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {exercises.slice(0, MAX_CARDS).map((e, i) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={`${e.name}. Open Exercise tab`}
            onPress={open}
            onLongPress={onLongPressExercise ? () => onLongPressExercise(e) : undefined}
            style={({ pressed }) => [
              sx("w-[200px] gap-space-sm rounded-lg bg-surface-container-low p-space-sm"),
              pressFeedback(pressed),
            ]}
          >
            <View style={sx("flex-row items-center gap-space-sm")}>
              <Image source={exercisePhoto(e.name, i)} style={styles.thumb} resizeMode="cover" />
              <View style={sx("min-w-0 flex-1")}>
                <Text style={sx("font-body-semi text-body-md text-on-surface")} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={sx("font-label-bold text-label-md text-primary-fixed")} numberOfLines={1}>
                  {detail(e)}
                </Text>
              </View>
            </View>
            <Text style={sx("font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
              {e.cue ?? `${e.targetSets}×${e.targetReps}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { gap: 12, paddingRight: 4 },
  thumb: { width: 40, height: 40, borderRadius: 20 },
});
