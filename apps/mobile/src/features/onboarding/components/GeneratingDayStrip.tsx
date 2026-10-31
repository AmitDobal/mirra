import { RefreshCw } from "lucide-react-native";
import { MotiView, type MotiTransition } from "moti";
import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

type DayState = "lime" | "lavender" | "active" | "pending";

type Day = {
  letter: string;
  tag: string;
  state: DayState;
  /** Stitch `opacity-*` on the pending days. */
  opacity: number;
  /** Stitch `bg-surface-container/NN` alpha as hex; empty = solid. */
  bgAlpha: string;
};

/** S11 Stitch microcycle strip (M–S). Decorative calibration visual. */
const DAYS: readonly Day[] = [
  { letter: "M", tag: "LEG", bgAlpha: "", state: "lime", opacity: 1 },
  { letter: "T", tag: "REC", bgAlpha: "", state: "lavender", opacity: 1 },
  { letter: "W", tag: "PUSH", bgAlpha: "", state: "lime", opacity: 1 },
  { letter: "T", tag: "PULL", bgAlpha: "", state: "active", opacity: 1 },
  { letter: "F", tag: "HYB", state: "pending", opacity: 0.6, bgAlpha: "99" },
  { letter: "S", tag: "AER", state: "pending", opacity: 0.4, bgAlpha: "80" },
  { letter: "S", tag: "OFF", state: "pending", opacity: 0.3, bgAlpha: "4D" },
];

const PULSE = {
  type: "timing",
  duration: 1000,
  loop: true,
  repeatReverse: true,
} as MotiTransition;

const dotGlow = (tint: string) => ({
  shadowColor: tint,
  shadowOpacity: 1,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 0 },
});

const Capsule = ({ state }: { state: DayState }) => {
  if (state === "active") {
    return (
      <MotiView
        from={{ opacity: 1 }}
        animate={{ opacity: 0.55 }}
        transition={PULSE}
        style={[styles.capsule, styles.capsuleActive]}
      >
        <RefreshCw size={12} color={color.onPrimary} strokeWidth={3} />
      </MotiView>
    );
  }
  if (state === "pending") {
    return (
      <View style={[styles.capsule, styles.capsulePending]}>
        <View style={styles.pendingDot} />
      </View>
    );
  }
  const tint = state === "lime" ? color.primaryFixed : color.secondary;
  return (
    <View
      style={[
        styles.capsule,
        { backgroundColor: state === "lime" ? `${tint}33` : `${tint}40` },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tint }, dotGlow(tint)]} />
    </View>
  );
};

const tagColor = (state: DayState) => {
  if (state === "lavender") return color.secondary;
  if (state === "pending") return color.outlineVariant;
  return color.primaryFixed;
};

const dayBackground = ({ state, bgAlpha }: Day) =>
  state === "active"
    ? color.surfaceContainerHigh
    : `${color.surfaceContainer}${bgAlpha}`;

/** 7-day microcycle capsule strip from the Stitch S11 export. */
export const GeneratingDayStrip = () => (
  <View style={styles.grid}>
    {DAYS.map((day, i) => (
      <View
        key={`${day.letter}-${i}`}
        style={[
          styles.col,
          { backgroundColor: dayBackground(day), opacity: day.opacity },
          day.state === "active" ? styles.colActive : null,
        ]}
      >
        <Text
          style={[
            styles.letter,
            { color: day.state === "active" ? color.primary : color.onSurfaceVariant },
          ]}
        >
          {day.letter}
        </Text>
        <Capsule state={day.state} />
        <Text
          style={[
            styles.tag,
            { color: tagColor(day.state) },
            day.state === "pending" ? styles.tagPending : null,
          ]}
          numberOfLines={1}
        >
          {day.tag}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.DEFAULT,
  },
  colActive: {
    transform: [{ scale: 1.05 }],
  },
  letter: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    marginBottom: 4,
  },
  capsule: {
    width: 20,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleActive: {
    backgroundColor: color.primaryFixed,
  },
  capsulePending: {
    backgroundColor: color.surfaceContainerHighest,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.outlineVariant,
  },
  tag: {
    marginTop: 6,
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
  },
  tagPending: {
    fontFamily: font.label,
    fontWeight: "400",
  },
});
