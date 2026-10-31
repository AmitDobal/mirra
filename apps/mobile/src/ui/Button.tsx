import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
} from "react-native";

import { color, font, radius, space, type } from "@/theme/tokens";

type ButtonVariant =
  | "lime"
  | "ghost"
  | "outline"
  | "apple"
  | "surface"
  | "surfaceLow";

/** `tall` matches Stitch auth stack (54px, 24px radius). */
type ButtonSize = "default" | "tall";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading glyph (e.g. provider mark). */
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
};

const variantBg: Record<ButtonVariant, string> = {
  lime: color.primaryContainer,
  ghost: "transparent",
  outline: "transparent",
  apple: color.primary,
  surface: color.surfaceContainerHigh,
  surfaceLow: color.surfaceContainerLow,
};

const variantLabel: Record<ButtonVariant, string> = {
  lime: color.onPrimaryFixed,
  ghost: color.onSurfaceVariant,
  outline: color.onSurface,
  apple: color.onPrimaryFixed,
  surface: color.onSurface,
  surfaceLow: color.onSurface,
};

/** Full-width pill CTA — Kinetic lime / ghost / outline. */
export const Button = ({
  label,
  onPress,
  variant = "lime",
  size = "default",
  icon,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = "button",
}: ButtonProps) => {
  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        size === "tall" ? styles.tall : null,
        {
          backgroundColor: variantBg[variant],
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: color.outlineVariant,
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: variantLabel[variant] }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: space.touch,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md - 4,
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
  },
  tall: {
    height: 54,
    borderRadius: radius.md,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: font.label,
    fontSize: type.labelLg.size,
    lineHeight: type.labelLg.line,
    letterSpacing: type.labelLg.tracking * type.labelLg.size,
  },
});
