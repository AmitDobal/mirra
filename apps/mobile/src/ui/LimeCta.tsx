import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: ReactNode;
  variant?: "lime" | "ghost" | "dark";
  className?: string;
};

/** Primary kinetic CTA — primary-fixed lime pill. */
export const LimeCta = ({
  label,
  onPress,
  accessibilityLabel,
  icon,
  variant = "lime",
  className = "",
}: Props) => {
  const styles =
    variant === "lime"
      ? "bg-primary-fixed"
      : variant === "dark"
        ? "bg-surface-container-highest"
        : "bg-transparent border border-outline-variant";
  const text =
    variant === "lime" ? "text-on-primary-fixed" : "text-on-surface";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center gap-space-sm rounded-full px-space-lg active:opacity-90 ${styles} ${className}`}
    >
      <Text className={`font-label-bold text-label-lg ${text}`}>{label}</Text>
      {icon ? <View>{icon}</View> : null}
    </Pressable>
  );
};
