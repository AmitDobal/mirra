import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { s15bTodayCheckinInline } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { pressFeedback } from "./press-style";

type Props = {
  /** ISO date `YYYY-MM-DD` used to decide whether the Sunday check-in is ready. */
  readonly todayDate: string;
};

const isSunday = (iso: string): boolean => new Date(`${iso}T12:00:00`).getDay() === 0;

/** S15B optional weekly shape / mirror chip → Progress. */
export const WeeklyMirrorChip = ({ todayDate }: Props) => {
  const ready = isSunday(todayDate);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Weekly shape check-in"
      onPress={() => router.push("/(tabs)/progress")}
      style={({ pressed }) => [
        sx("mb-space-md flex-row items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm"),
        pressFeedback(pressed),
      ]}
    >
      <Image
        source={s15bTodayCheckinInline.mirror}
        accessibilityLabel="Weekly physique progress"
        style={styles.thumb}
        resizeMode="cover"
      />
      <View style={sx("min-w-0 flex-1")}>
        <Text style={sx("font-body-semi text-body-md text-on-surface")} numberOfLines={1}>
          Weekly Shape Check-in
        </Text>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>Due Sunday</Text>
      </View>
      <View
        style={sx(
          `rounded-full px-3 py-1 ${ready ? "bg-tertiary-container" : "bg-surface-container-highest"}`,
        )}
      >
        <Text
          style={sx(
            `font-label-bold text-label-md ${ready ? "text-on-tertiary-container" : "text-on-surface-variant"}`,
          )}
        >
          {ready ? "Ready" : "Soon"}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
});
