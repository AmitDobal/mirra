import { ChartNoAxesColumn, TrendingDown } from "lucide-react-native";
import { MotiView } from "moti";
import { Image, StyleSheet, Text, View } from "react-native";

import { s20cAdjustToday } from "../../../assets/stitch";
import { timing } from "@/features/fuel/snap/motion";
import { color, font, radius, space, type } from "@/theme/tokens";

import type { WorkoutDiff } from "./checkin-logic";

const SETTLE_MS = 200;

type DiffProps = {
  readonly diff: WorkoutDiff | null;
  /** Changes when the mode changes so the new minutes pulse once. */
  readonly pulseKey: string;
};

/** Before → after workout card (thumbnail, title, minutes, one-line reason). */
export const WorkoutDiffCard = ({ diff, pulseKey }: DiffProps) => {
  const changed = diff != null && diff.afterMin !== diff.beforeMin;
  return (
    <View style={styles.diff}>
      <View style={styles.thumb}>
        <Image source={s20cAdjustToday.hero} style={styles.thumbImg} resizeMode="cover" />
      </View>
      <View style={styles.diffBody}>
        <View style={styles.titleRow}>
          <Text style={styles.diffTitle} numberOfLines={1}>
            {diff?.title ?? "Rest day"}
          </Text>
          {diff && changed ? (
            <>
              <Text style={styles.before}>{diff.beforeMin}m</Text>
              <Text style={styles.arrow}>→</Text>
              <MotiView
                key={pulseKey}
                from={{ scale: 1.14 }}
                animate={{ scale: 1 }}
                transition={timing({ duration: SETTLE_MS })}
              >
                <Text style={styles.after}>{diff.afterMin}m</Text>
              </MotiView>
            </>
          ) : diff ? (
            <Text style={styles.same}>{diff.afterMin}m</Text>
          ) : null}
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {diff?.detail ?? "Recovery stays on the plan · Nothing to trim"}
        </Text>
      </View>
    </View>
  );
};

type MetricProps = {
  readonly label: string;
  readonly value: string;
  readonly tone: "lime" | "lavender";
  readonly Icon: typeof TrendingDown;
};

const Metric = ({ label, value, tone, Icon }: MetricProps) => {
  const tint = tone === "lime" ? color.primaryContainer : color.secondary;
  return (
    <View style={styles.metric}>
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, tone === "lavender" && { color: color.secondary }]}>
          {value}
        </Text>
      </View>
      <View style={styles.metricIcon}>
        <Icon size={18} color={tint} />
      </View>
    </View>
  );
};

/** Volume match + fatigue index pair (plan estimates). */
export const ImpactPair = ({ diff }: { readonly diff: WorkoutDiff | null }) => (
  <View style={styles.pair}>
    <Metric
      label="Volume match"
      value={diff ? `${diff.volumeMatchPct}%` : "—"}
      tone="lime"
      Icon={ChartNoAxesColumn}
    />
    <Metric
      label="Fatigue index"
      value={diff ? `${diff.fatiguePct > 0 ? "+" : ""}${diff.fatiguePct}%` : "—"}
      tone="lavender"
      Icon={TrendingDown}
    />
  </View>
);

const styles = StyleSheet.create({
  diff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: space.md,
    borderRadius: radius.DEFAULT,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: color.surfaceContainerLow,
    borderWidth: 1,
    borderColor: color.surfaceContainerHighest,
  },
  thumbImg: { width: "100%", height: "100%" },
  diffBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  diffTitle: {
    flexShrink: 1,
    fontFamily: font.headlineSemi,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  before: {
    fontFamily: font.body,
    fontSize: 14,
    color: color.onSurfaceVariant,
    textDecorationLine: "line-through",
  },
  arrow: { fontFamily: font.body, fontSize: 14, color: color.onSurfaceVariant },
  after: { fontFamily: font.headline, fontSize: 16, color: color.primaryContainer },
  same: { fontFamily: font.label, fontSize: 14, color: color.onSurfaceVariant },
  detail: {
    marginTop: 2,
    fontFamily: font.body,
    fontSize: type.bodySm.size,
    lineHeight: type.bodySm.line,
    color: color.onSurfaceVariant,
  },
  pair: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 20,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  metricLabel: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  metricValue: {
    marginTop: 2,
    fontFamily: font.headlineSemi,
    fontSize: type.headlineMd.size,
    lineHeight: type.headlineMd.line,
    color: color.onSurface,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerLow,
    borderWidth: 1,
    borderColor: color.surfaceContainerHighest,
  },
});
