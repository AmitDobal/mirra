import type { ViewStyle } from "react-native";

/** Subtle press feedback shared by Today rows (scale 0.98 + slight dim). */
export const pressFeedback = (pressed: boolean): ViewStyle => ({
  transform: [{ scale: pressed ? 0.98 : 1 }],
  opacity: pressed ? 0.92 : 1,
});
