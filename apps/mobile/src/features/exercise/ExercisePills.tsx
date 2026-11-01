import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

type PillProps = {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress: () => void;
  /** `square` = equipment filter (Stitch rounded-lg), default = rounded pill. */
  readonly shape?: "pill" | "square";
};

/** Compact library filter pill (S25 movement / equipment rows). */
export const FilterPill = ({ label, selected = false, onPress, shape = "pill" }: PillProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Filter ${label}`}
    accessibilityState={{ selected }}
    onPress={onPress}
    hitSlop={6}
    style={[
      styles.pill,
      shape === "square" ? styles.square : styles.round,
      selected
        ? shape === "pill"
          ? styles.pillOn
          : styles.squareOn
        : styles.pillOff,
    ]}
  >
    <Text
      style={[
        styles.pillText,
        { color: selected && shape === "pill" ? color.onPrimaryFixed : color.onSurface },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

type TagProps = {
  readonly label: string;
  readonly tone?: "neutral" | "lavender" | "lime";
};

/** Static tag chip (muscle / equipment / level on S26). */
export const TagChip = ({ label, tone = "neutral" }: TagProps) => (
  <View style={[styles.tag, tagBg[tone]]}>
    <Text style={[styles.tagText, { color: tagFg[tone] }]}>{label}</Text>
  </View>
);

const tagBg = StyleSheet.create({
  neutral: { backgroundColor: color.surfaceContainerHigh, borderColor: color.outlineVariant },
  lavender: { backgroundColor: color.secondaryContainer, borderColor: color.secondaryContainer },
  lime: { backgroundColor: color.onPrimaryFixed, borderColor: color.onPrimaryFixedVariant },
});

const tagFg = {
  neutral: color.onSurface,
  lavender: color.onSecondaryContainer,
  lime: color.primaryFixed,
} as const;

const styles = StyleSheet.create({
  pill: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  round: { borderRadius: radius.full },
  square: { borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 30 },
  pillOn: { backgroundColor: color.primaryContainer, borderColor: color.primaryContainer },
  squareOn: { backgroundColor: color.surfaceContainerHighest, borderColor: color.outline },
  pillOff: { backgroundColor: "transparent", borderColor: color.outlineVariant },
  pillText: { fontFamily: font.label, fontSize: 12, lineHeight: 16 },
  tag: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontFamily: font.label, fontSize: 12, lineHeight: 16 },
});
