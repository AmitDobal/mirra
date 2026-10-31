import { Zap } from "lucide-react-native";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly pct: number;
  readonly over?: boolean;
  readonly size?: number;
};

/** S18 remaining-budget ring — lime arc for progress, lavender tip, dark track. */
export const CalorieDonut = ({ pct, over = false, size = 88 }: Props) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const progress = (clamped / 100) * c;
  const tip = Math.min(c * 0.04, progress * 0.15);
  const main = Math.max(0, progress - tip);
  const track = color.surfaceContainerHighest;
  const fill = over ? color.error : color.primaryFixed;
  const tipColor = over ? color.error : color.secondary;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View
      accessible
      accessibilityLabel={`${clamped} percent of calorie goal`}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={fill}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${main} ${c - main}`}
            strokeLinecap="round"
          />
          {tip > 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={tipColor}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${tip} ${c - tip}`}
              strokeDashoffset={-main}
              strokeLinecap="round"
            />
          ) : null}
        </G>
      </Svg>
      <Zap
        size={14}
        color={over ? color.error : color.primaryFixed}
        fill={over ? color.error : color.primaryFixed}
      />
      <Text
        style={sx(
          `mt-0.5 font-label-bold text-label-lg ${over ? "text-error" : "text-on-surface"}`,
        )}
      >
        {`${clamped}%`}
      </Text>
      <Text style={sx("font-label-bold text-label-caps text-on-surface-variant")}>Of goal</Text>
    </View>
  );
};
