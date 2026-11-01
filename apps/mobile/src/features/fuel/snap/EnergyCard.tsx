import { Flame } from "lucide-react-native";
import { MotiView } from "moti";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";
import { spring } from "./motion";

type Props = {
  readonly kcal: number;
  readonly targetKcal: number;
  readonly loggedKcal: number;
};

const SIZE = 84;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** "Estimated energy" card: big kcal + share of daily target ring. */
export const EnergyCard = ({ kcal, targetKcal, loggedKcal }: Props) => {
  const hasTarget = targetKcal > 0;
  const pct = hasTarget ? Math.round((kcal / targetKcal) * 100) : 0;
  const left = Math.max(0, targetKcal - loggedKcal - kcal);
  const arc = (Math.min(100, pct) / 100) * C;

  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <CapsLabel>Estimated energy</CapsLabel>
        <View style={styles.big}>
          <Text style={styles.kcal}>{kcal}</Text>
          <Text style={styles.unit}>KCAL</Text>
        </View>
        <View style={styles.sub}>
          <View style={styles.dot} />
          <Text style={styles.subText} numberOfLines={1}>
            {hasTarget
              ? `${pct}% of daily target · ${left.toLocaleString()} kcal left`
              : "Set a plan to see your daily target"}
          </Text>
        </View>
      </View>
      <View style={styles.ring} accessible accessibilityLabel={`${pct} percent of daily target`}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={color.surfaceContainerHighest}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={color.primaryFixed}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${arc} ${C - arc}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <MotiView
          from={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring({ damping: 12, delay: 250 })}
        >
          <Flame size={22} color={color.primaryFixed} />
        </MotiView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    padding: space.lg,
    marginBottom: space.md,
  },
  main: { flex: 1 },
  big: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  kcal: {
    fontFamily: font.display,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.5,
    color: color.onSurface,
  },
  unit: { fontFamily: font.headline, fontSize: 16, color: color.primaryFixed },
  sub: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed },
  subText: { flexShrink: 1, fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
});
