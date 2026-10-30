import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { color, radius } from "@/theme/tokens";

type CardTone = "elevated" | "lime" | "lavender" | "lowest";

type CardProps = {
  children: ReactNode;
  tone?: CardTone;
  /** @deprecated NativeWind removed */ className?: string;
  style?: StyleProp<ViewStyle>;
};

const toneBg: Record<CardTone, string> = {
  elevated: color.surfaceContainerHigh,
  lime: color.primaryContainer,
  lavender: color.secondaryContainer,
  lowest: color.surfaceContainerLowest,
};

/** Rounded surface block — tokens only. */
export const Card = ({ children, tone = "elevated", style }: CardProps) => (
  <View
    style={[styles.base, { backgroundColor: toneBg[tone] }, style]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderRadius: radius.md,
  },
});
