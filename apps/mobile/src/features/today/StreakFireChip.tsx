import { Pressable, Text, View } from "react-native";

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
  if (streak.fire === "cold") return "No active streak. Check in to start one";
  return days;
};

/** S29 header chip: crimson flame + day count. `lit` glows, `at_risk` is outlined, `cold` is muted. */
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
          `flex-row items-center gap-1 rounded-full border px-2.5 py-1.5 ${
            cold
              ? "border-outline-variant bg-surface-container-high"
              : lit
                ? "border-streak-fire/40 bg-streak-fire/15"
                : "border-streak-fire/60 bg-transparent"
          }`,
        ),
        lit ? { shadowColor: color.streakFire, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } } : null,
        pressFeedback(pressed),
      ]}
    >
      <View style={{ opacity: lit || cold ? 1 : 0.7 }}>
        <FlameIcon size={18} lit={!cold} />
      </View>
      <Text
        style={sx(
          `font-label-bold text-label-md ${cold ? "text-on-surface-variant" : "text-streak-fire"}`,
        )}
      >
        {streak.current}
      </Text>
    </Pressable>
  );
};
