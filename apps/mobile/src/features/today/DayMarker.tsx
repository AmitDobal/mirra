import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { color } from "@/theme/tokens";

import { FlameIcon } from "./FlameIcon";
import type { DayMarker as Marker } from "./week-strip-model";

/** Slot keeps the old 6pt dot height so the strip never changes size (S42: 98pt card unchanged). */
const SLOT = 6;
const DOT = 6;
/** S42: filled crimson flame, 10–12pt. Centered on the 6pt slot; overflows into the card's 4pt bottom pad. */
const FLAME = 10;
const FADE_MS = 220;

type Props = {
  readonly marker: Marker;
};

/** S42 week-strip marker: streak flame for a completed workout, muted dot for presence only. */
export const DayMarker = ({ marker }: Props) => {
  const [opacity] = useState(() => new Animated.Value(0));
  const visible = marker !== "none";

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.slot}
    >
      <Animated.View style={[styles.center, { opacity }]}>
        {marker === "flame" ? <FlameIcon size={FLAME} /> : marker === "dot" ? <View style={styles.dot} /> : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    height: SLOT,
    width: FLAME,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  center: {
    position: "absolute",
    top: (SLOT - FLAME) / 2,
    left: 0,
    width: FLAME,
    height: FLAME,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.onSurfaceVariant,
  },
});
