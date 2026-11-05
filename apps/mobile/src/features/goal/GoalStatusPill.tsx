import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

import type { StatusTone } from "./goal-view";

const TONES: Record<StatusTone, { bg: string; fg: string }> = {
  lime: { bg: color.primaryContainer, fg: color.onPrimaryFixed },
  lavender: { bg: color.secondary, fg: color.onSecondaryFixed },
  // `behind` / `no_target`: calm neutral, never crimson (DESIGN.md: crimson = destructive only).
  neutral: { bg: color.surfaceContainerHigh, fg: color.onSurface },
};

type Props = { readonly label: string; readonly tone: StatusTone; readonly size?: "sm" | "md" };

/** S44 / S45 status pill: "On track" lime, "Calibrating" lavender, others neutral. */
export const GoalStatusPill = ({ label, tone, size = "sm" }: Props) => (
  <View style={[styles.pill, size === "md" && styles.md, { backgroundColor: TONES[tone].bg }]}>
    <Text style={[styles.text, size === "md" && styles.mdText, { color: TONES[tone].fg }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 12, paddingVertical: 4 },
  text: { fontFamily: font.label, fontSize: 11, lineHeight: 16 },
  mdText: { fontSize: 12 },
});
