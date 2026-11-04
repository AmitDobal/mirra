import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { color, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly title: string;
  /** S34 title is on-surface-variant, S37 is on-surface. */
  readonly tone?: "muted" | "bright";
};

/** 56pt top bar (S34 / S37): 40pt round back button + centered caps title. */
export const StrengthTopBar = ({ title, tone = "muted" }: Props) => (
  <View style={styles.bar}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/you"))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <ArrowLeft size={20} color={color.onSurface} />
    </Pressable>
    <CapsLabel style={tone === "bright" ? styles.bright : undefined}>{title}</CapsLabel>
    <View style={styles.spacer} />
  </View>
);

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingHorizontal: space.margin,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.95 }] },
  bright: { color: color.onSurface },
  spacer: { width: 40 },
});
