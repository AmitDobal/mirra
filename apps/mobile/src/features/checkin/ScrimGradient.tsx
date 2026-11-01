import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { color } from "@/theme/tokens";

type Stops = readonly (readonly [offset: number, opacity: number])[];

/** Stitch `from-background via-background/40 to-transparent` + soft top shade. */
const HERO_STOPS: Stops = [
  [0, 0.3],
  [0.5, 0.4],
  [1, 1],
];
/** Stitch `from-surface via-surface/95 to-transparent` sticky dock. */
const DOCK_STOPS: Stops = [
  [0, 0],
  [0.4, 0.95],
  [1, 1],
];

type Props = {
  readonly id: string;
  readonly variant?: "hero" | "dock";
};

/** Bottom-up surface scrim for photo heroes and the sticky action dock. */
export const ScrimGradient = ({ id, variant = "hero" }: Props) => (
  <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {(variant === "hero" ? HERO_STOPS : DOCK_STOPS).map(([offset, opacity]) => (
          <Stop key={offset} offset={offset} stopColor={color.surface} stopOpacity={opacity} />
        ))}
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>
);
