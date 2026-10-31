import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly pct: number;
  readonly size?: number;
  readonly stroke?: number;
};

/** S15 Target Pace dual-ring donut — lime progress over track. */
export const KcalDonut = ({ pct, size = 56, stroke = 4 }: Props) => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  return (
    <View
      accessible
      accessibilityLabel={`${clamped} percent of calorie target`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.surfaceContainerHighest}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.primaryFixed}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <View
        style={[
          sx("absolute inset-0 items-center justify-center"),
          { width: size, height: size },
        ]}
      >
        <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>
          {clamped}%
        </Text>
      </View>
    </View>
  );
};
