import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { color, font, radius, space, type } from "@/theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: ReactNode;
  variant?: "lime" | "ghost" | "dark";
  /** @deprecated NativeWind removed */ className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Primary kinetic CTA — primary-fixed lime pill. */
export const LimeCta = ({
  label,
  onPress,
  accessibilityLabel,
  icon,
  variant = "lime",
  style,
}: Props) => {
  const bg =
    variant === "lime"
      ? color.primaryFixed
      : variant === "dark"
        ? color.surfaceContainerHighest
        : "transparent";
  const textColor =
    variant === "lime" ? color.onPrimaryFixed : color.onSurface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: color.outlineVariant,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {icon ? <View>{icon}</View> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
  },
  label: {
    fontFamily: font.labelBold,
    fontSize: type.labelLg.size,
    lineHeight: type.labelLg.line,
    letterSpacing: type.labelLg.tracking * type.labelLg.size,
  },
});
