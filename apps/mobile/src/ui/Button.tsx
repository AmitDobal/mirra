import { Pressable, Text, type AccessibilityRole } from "react-native";

type ButtonVariant = "lime" | "ghost" | "outline" | "apple" | "surface";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
};

const variantClass: Record<ButtonVariant, string> = {
  lime: "bg-primary-container",
  ghost: "bg-transparent",
  outline: "bg-transparent border border-outline-variant",
  apple: "bg-primary",
  surface: "bg-surface-container-high",
};

const labelClass: Record<ButtonVariant, string> = {
  lime: "text-on-primary-fixed",
  ghost: "text-on-surface-variant",
  outline: "text-on-surface",
  apple: "text-on-primary-fixed",
  surface: "text-on-surface",
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
      className={`h-touch w-full items-center justify-center rounded-full px-space-lg ${variantClass[variant]} ${disabled ? "opacity-40" : "opacity-100"}`}
    >
      <Text className={`font-label text-label-lg ${labelClass[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
};
