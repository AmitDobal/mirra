import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { color } from "@/theme/tokens";

type Props = {
  readonly size?: number;
  /** `false` = cold streak: flat muted flame, no gradient. */
  readonly lit?: boolean;
};

const OUTER =
  "M24 4C24 4 28 11 28 16C28 18.2 27.2 20.1 26 21.5C28.8 20.2 31 17.5 31.8 14.5C36 19.2 38 25.5 38 31C38 38.7 31.7 44 24 44C16.3 44 10 38.7 10 31C10 24 14.5 17 21 12C20.5 14.5 21.2 17 22.8 18.8C23.6 15 24 8 24 4Z";
const CORE =
  "M24 42C28.4 42 32 38.4 32 34C32 29.5 28.5 26 26.5 23.5C26 25 25 26.2 23.5 27C23.5 24 22 21 20 19C18 23 16 27.5 16 33C16 38 19.6 42 24 42Z";

/** Stitch S29 crimson flame (`stitch_mirra_ai_personal_trainer/s29_streak_fire/code.svg`). */
export const FlameIcon = ({ size = 20, lit = true }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Defs>
      <LinearGradient id="mirraFlame" x1="24" y1="44" x2="24" y2="4" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={color.streakFireDeep} />
        <Stop offset="0.5" stopColor={color.streakFire} />
        <Stop offset="1" stopColor={color.streakFireTip} />
      </LinearGradient>
    </Defs>
    <Path d={OUTER} fill={lit ? "url(#mirraFlame)" : color.outline} />
    <Path d={CORE} fill={lit ? color.onSurface : color.surfaceContainerHigh} fillOpacity={0.9} />
  </Svg>
);
