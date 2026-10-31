import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import type { AttendanceState } from "@/lib/api";
import { color } from "@/theme/tokens";

const DOT_SIZE = 6;
const FADE_MS = 220;

type Props = {
  readonly state: AttendanceState;
};

/** 6pt presence marker. `active` is lime, `open` is muted. Always reserves its space so the strip never jumps. */
export const PresenceDot = ({ state }: Props) => {
  const [opacity] = useState(() => new Animated.Value(0));
  const visible = state !== "none";

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.dot,
        { opacity },
        state === "active" ? styles.active : styles.open,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  active: { backgroundColor: color.primaryFixed },
  open: { backgroundColor: color.onSurfaceVariant },
});
