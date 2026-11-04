import { Flame } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Streak } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { FlameIcon } from "./FlameIcon";
import { pressFeedback } from "./press-style";

type Props = {
  readonly streak: Streak;
  readonly onPress?: () => void;
};

const labelFor = (streak: Streak): string => {
  const days = `${streak.current}-day streak`;
  if (streak.fire === "at_risk") return `${days}. Check in today to keep it`;
  if (streak.fire === "cold") return "Start a streak: check in today";
  return days;
};

/**
 * S40 header chip. `lit`: crimson tint + filled S29 flame. `at_risk`: crimson outline, dimmed flame.
 * `cold` (zero state): transparent pill, outlined grey flame, muted count.
 */
export const StreakFireChip = ({ streak, onPress }: Props) => {
  const lit = streak.fire === "lit";
  const cold = streak.fire === "cold";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelFor(streak)}
      onPress={onPress}
      style={({ pressed }) => [
        sx(
          `shrink-0 flex-row items-center gap-1 rounded-full border px-[10px] py-1.5 ${
            cold
              ? "border-outline-variant bg-transparent"
              : lit
                ? "border-streak-fire/40 bg-streak-fire/15"
                : "border-streak-fire/60 bg-transparent"
          }`,
        ),
        pressFeedback(pressed),
      ]}
    >
      {cold ? (
        <Flame size={14} color={color.outline} strokeWidth={2} />
      ) : lit ? (
        <FlameIcon size={15} />
      ) : (
        <View style={styles.atRisk}>
          <FlameIcon size={15} />
        </View>
      )}
      <Text style={sx(`font-label-md text-label-md ${cold ? "text-on-surface-variant" : "text-streak-fire"}`)}>
        {streak.current}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  atRisk: { opacity: 0.7 },
});
