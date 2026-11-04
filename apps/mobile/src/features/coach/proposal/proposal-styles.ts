import type { ViewStyle } from "react-native";

import { color } from "@/theme/tokens";

/** Hex token + 0-1 alpha → hex8 (keeps colors on theme tokens). */
export const alpha = (hex: string, a: number): string =>
  `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** S39 hairline (#2a2a2a) = surface-container-high. */
export const hairline = color.surfaceContainerHigh;

/** S39 diff block: surface-container-lowest, radius 24, padding 14, hairline border. */
export const blockStyle: ViewStyle = {
  backgroundColor: color.surfaceContainerLowest,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: hairline,
  padding: 14,
};
