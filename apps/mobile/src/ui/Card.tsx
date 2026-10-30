import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

type CardTone = "elevated" | "lime" | "lavender" | "lowest";

type CardProps = ViewProps & {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
};

const toneClass: Record<CardTone, string> = {
  elevated: "bg-surface-container-high",
  lime: "bg-primary-container",
  lavender: "bg-secondary-container",
  lowest: "bg-surface-container-lowest",
};

/** Rounded surface block — no raw hex; tokens only. */
export const Card = ({
  children,
  tone = "elevated",
  className = "",
  ...rest
}: CardProps) => (
  <View
    className={`overflow-hidden rounded-md ${toneClass[tone]} ${className}`}
    {...rest}
  >
    {children}
  </View>
);
