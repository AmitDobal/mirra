import type { TextStyle, ViewStyle } from "react-native";

import type { Style } from "./layout";
import { applyOne } from "./parse";

/**
 * Maps Mirra Tailwind-like class strings to RN styles.
 * NativeWind is disabled on Expo SDK 58 (css-interop + React 19.3 break).
 * Tables live in `colors` / `spacing` / `type` / `layout`; the class parser in `parse`.
 */
export const sx = (
  ...parts: (string | false | null | undefined)[]
): ViewStyle & TextStyle => {
  const out: Style = {};
  for (const part of parts) {
    if (!part) continue;
    for (const cls of part.split(/\s+/)) {
      applyOne(cls, out);
    }
  }
  return out as ViewStyle & TextStyle;
};
