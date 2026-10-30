import {
  Pressable,
  StyleSheet,
  Text,
  type AccessibilityRole,
} from "react-native";

import { color, font, radius, space, type } from "@/theme/tokens";

type ButtonVariant = "lime" | "ghost" | "outline" | "apple" | "surface";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
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
};

const variantLabel: Record<ButtonVariant, string> = {
  lime: color.onPrimaryFixed,
  ghost: color.onSurfaceVariant,
  outline: color.onSurface,
  apple: color.onPrimaryFixed,
  surface: color.onSurface,
};

/** Full-width pill CTA — Kinetic lime / ghost / outline. */
export const Button = ({
  label,
  onPress,
  variant = "lime",
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
      style={[
        styles.base,
        {
          backgroundColor: variantBg[variant],
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: color.outlineVariant,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
  },
  label: {
    fontFamily: font.label,
    fontSize: type.labelLg.size,
    lineHeight: type.labelLg.line,
    letterSpacing: type.labelLg.tracking * type.labelLg.size,
  },
});
