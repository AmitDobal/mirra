import type { ReactNode } from "react";
import { Text } from "react-native";

type Props = {
  children: ReactNode;
  tone?: "muted" | "lime" | "dark";
  className?: string;
};

export const CapsLabel = ({
  children,
  tone = "muted",
  className = "",
}: Props) => {
  const color =
    tone === "lime"
      ? "text-primary-fixed"
      : tone === "dark"
        ? "text-on-primary-fixed"
        : "text-on-surface-variant";

  return (
    <Text
      className={`font-label-bold text-label-caps uppercase tracking-widest ${color} ${className}`}
    >
      {children}
    </Text>
  );
};
