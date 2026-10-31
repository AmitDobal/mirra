import { Bed, Dumbbell, Flame, Footprints } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { color, font, radius } from "@/theme/tokens";

type HeroProps = {
  title: string;
  kcal: number | undefined;
  fallbackKcal: string;
  workoutCount: number;
  restCount: number;
  recoveryCount: number;
  readinessPct: number;
};

const HeroRings = () => (
  <Svg
    width={192}
    height={192}
    viewBox="0 0 200 200"
    style={{ position: "absolute", right: -24, bottom: -32, opacity: 0.15 }}
  >
    <Circle cx={100} cy={100} r={90} stroke={color.onPrimaryFixed} strokeWidth={12} fill="none" />
    <Circle cx={100} cy={100} r={64} stroke={color.onPrimaryFixed} strokeWidth={10} fill="none" />
    <Circle cx={100} cy={100} r={38} stroke={color.onPrimaryFixed} strokeWidth={8} fill="none" />
  </Svg>
);

const ReadinessRing = ({ pct }: { pct: number }) => {
  const size = 40;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size} style={styles.ringSvg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(22,30,0,0.2)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.onPrimaryFixed}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.ringText}>{clamped}%</Text>
    </View>
  );
};

type StatProps = { icon: ReactNode; label: string };

const Stat = ({ icon, label }: StatProps) => (
  <View style={styles.stat}>
    {icon}
    <Text style={styles.statText}>{label}</Text>
  </View>
);

/** S12 lime weekly target — watermark rings, kcal chip, icon row from plan counts. */
export const WeekRevealHero = ({
  title,
  kcal,
  fallbackKcal,
  workoutCount,
  restCount,
  recoveryCount,
  readinessPct,
}: HeroProps) => {
  const iconColor = color.onPrimaryFixed;
  return (
    <View style={styles.card}>
      <HeroRings />
      <View style={styles.topRow}>
        <View style={styles.topCopy}>
          <Text style={styles.eyebrow}>Weekly Target</Text>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        </View>
        <ReadinessRing pct={readinessPct} />
      </View>

      <View style={styles.chipRow}>
        <View style={styles.kcalChip}>
          <Flame size={15} color={color.primaryContainer} fill={color.primaryContainer} />
          <Text style={styles.kcalText}>
            {kcal != null ? `${kcal.toLocaleString()} kcal/day` : fallbackKcal}
          </Text>
        </View>
        <View style={styles.phaseChip}>
          <Text style={styles.phaseText}>Phase 1</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Stat
          icon={<Dumbbell size={16} color={iconColor} />}
          label={`${workoutCount} Workout${workoutCount === 1 ? "" : "s"}`}
        />
        <Text style={styles.dot}>•</Text>
        <Stat icon={<Bed size={16} color={iconColor} />} label={`${restCount} Rest`} />
        <Text style={styles.dot}>•</Text>
        <Stat
          icon={<Footprints size={16} color={iconColor} />}
          label={`${recoveryCount} Active recovery`}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: color.primaryContainer,
    padding: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  topCopy: { flex: 1, paddingRight: 16 },
  eyebrow: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "rgba(60,77,0,0.85)",
  },
  title: {
    marginTop: 4,
    fontFamily: font.headlineSemi,
    fontSize: 18,
    lineHeight: 24,
    color: color.onPrimaryFixed,
  },
  ringWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22,30,0,0.1)",
  },
  ringSvg: { transform: [{ rotate: "-90deg" }] },
  ringText: {
    position: "absolute",
    fontFamily: font.labelBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.onPrimaryFixed,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  kcalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: color.onPrimaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kcalText: {
    fontFamily: font.labelBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.primaryContainer,
  },
  phaseChip: {
    borderRadius: radius.full,
    backgroundColor: "rgba(22,30,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  phaseText: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    color: color.onPrimaryFixed,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(22,30,0,0.15)",
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    color: color.onPrimaryFixed,
  },
  dot: { fontSize: 12, color: "rgba(22,30,0,0.4)" },
});

/** Short split title from workout names/foci — not a long AI blurb. */
export const splitTitleFromWorkouts = (
  workouts: readonly { title: string; focus?: string | null }[],
  fallback: string,
): string => {
  if (!workouts.length) return fallback;
  const blob = workouts
    .map((w) => `${w.title} ${w.focus ?? ""}`.toLowerCase())
    .join(" ");
  const hasUpper = /upper|push|chest|shoulder/.test(blob);
  const hasLower = /lower|leg|squat|pull|back/.test(blob);
  const hasFull = /full.?body|full body/.test(blob);
  if (hasUpper && hasLower) return "Upper + lower split";
  if (hasFull) return "Full-body microcycle";
  if (hasUpper) return "Upper emphasis";
  if (hasLower) return "Lower emphasis";
  if (workouts.length === 1) return workouts[0]!.title;
  return fallback;
};
