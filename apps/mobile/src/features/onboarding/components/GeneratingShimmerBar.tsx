import { MotiView, type MotiTransition } from "moti";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius } from "@/theme/tokens";

type Props = {
  width: number;
  height?: number;
  baseColor: string;
  /** Highlight sheen (lime / lavender / bright white at low alpha). */
  sheenColor?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

const SWEEP = (delay: number): MotiTransition =>
  ({
    type: "timing",
    duration: 1300,
    loop: true,
    delay,
  }) as MotiTransition;

const PULSE = (delay: number): MotiTransition =>
  ({
    type: "timing",
    duration: 1100,
    loop: true,
    repeatReverse: true,
    delay,
  }) as MotiTransition;

/**
 * Skeleton bar with Moti opacity pulse + sliding sheen — clearer “AI working”
 * cue than a static gray chip.
 */
export const GeneratingShimmerBar = ({
  width,
  height = 12,
  baseColor,
  sheenColor = "rgba(255,255,255,0.35)",
  delay = 0,
  style,
}: Props) => (
  <MotiView
    from={{ opacity: 0.55 }}
    animate={{ opacity: 1 }}
    transition={PULSE(delay)}
    style={[styles.track, { width, height, backgroundColor: baseColor }, style]}
  >
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <MotiView
        from={{ translateX: -56 }}
        animate={{ translateX: width + 8 }}
        transition={SWEEP(delay)}
        style={[styles.sheen, { height, backgroundColor: sheenColor }]}
      />
    </View>
  </MotiView>
);

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.full,
    overflow: "hidden",
    flexShrink: 1,
  },
  clip: {
    overflow: "hidden",
    borderRadius: radius.full,
  },
  sheen: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 48,
    borderRadius: radius.full,
    opacity: 0.85,
  },
});
