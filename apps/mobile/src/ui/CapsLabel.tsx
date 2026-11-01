import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { color, font, type } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  tone?: "muted" | "lime" | "dark" | "alert";
  /** @deprecated NativeWind removed */ className?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

const toneColor = {
  muted: color.onSurfaceVariant,
  lime: color.primaryFixed,
  dark: color.onPrimaryFixed,
  alert: color.error,
} as const;

export const CapsLabel = ({ children, tone = "muted", style, numberOfLines }: Props) => (
  <Text numberOfLines={numberOfLines} style={[styles.base, { color: toneColor[tone] }, style]}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  base: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: type.labelCaps.tracking * type.labelCaps.size,
    textTransform: "uppercase",
  },
});
