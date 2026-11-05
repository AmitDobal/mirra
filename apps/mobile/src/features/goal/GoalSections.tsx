import { router } from "expo-router";
import { ChevronLeft, Ellipsis } from "lucide-react-native";
import { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { GoalChart } from "./chart/GoalChart";
import type { GoalView } from "./goal-view";
import { GoalStatusPill } from "./GoalStatusPill";

const c = goalCopy.screen;

/** Back with no history (cold deep link) → You tab, never an app exit. */
const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/you");
};

/** S44 56pt top bar: round back, caps GOAL, round more (restart). */
export const GoalTopBar = ({ onMore }: { readonly onMore: (() => void) | null }) => {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) return false;
      router.replace("/(tabs)/you");
      return true;
    });
    return () => sub.remove();
  }, []);
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={c.back} hitSlop={8} onPress={goBack} style={styles.round}>
        <ChevronLeft size={20} color={color.onSurface} />
      </Pressable>
      <CapsLabel style={styles.barTitle}>{c.title}</CapsLabel>
      {onMore ? (
        <Pressable accessibilityRole="button" accessibilityLabel={c.more} hitSlop={8} onPress={onMore} style={styles.round}>
          <Ellipsis size={20} color={color.onSurface} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

/** S44 hero: lime eyebrow, "Around Feb 18" + status pill, range line, notices. */
export const GoalHero = ({ view }: { readonly view: GoalView }) => (
  <View>
    <View style={styles.eyebrowRow}>
      <View style={styles.eyebrowDot} />
      <CapsLabel tone="lime">{view.eyebrow}</CapsLabel>
    </View>
    <View style={styles.headRow}>
      <Text style={styles.headline}>{view.headline}</Text>
      <GoalStatusPill label={view.status.label} tone={view.status.tone} size="md" />
    </View>
    {view.sub ? <Text style={styles.sub}>{view.sub}</Text> : null}
    {view.notices.map((n) => (
      <Text key={n} style={styles.notice}>
        {n}
      </Text>
    ))}
  </View>
);

/** S44 chart card: WEIGHT TREND + "Last 5 weeks", full chart, legend. */
export const GoalChartCard = ({ chart }: { readonly chart: NonNullable<GoalView["chart"]> }) => (
  <View style={[styles.card, styles.chartCard]}>
    <View style={styles.between}>
      <CapsLabel numberOfLines={1} style={[styles.bright, styles.titleShrink]}>
        {c.chartTitle}
      </CapsLabel>
      <Text numberOfLines={1} style={styles.caption}>
        {chart.caption}
      </Text>
    </View>
    <View style={styles.chart}>
      <GoalChart
        data={chart.data}
        variant="full"
        etaWeeks={chart.etaWeeks}
        todayCaps={c.todayCaps}
        accessibilityLabel={chart.a11y}
      />
    </View>
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={styles.legendLine} />
        <Text style={styles.legendText}>{c.legend.trend}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>{c.legend.weighIns}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={styles.legendSquare} />
        <Text style={styles.legendText}>{c.legend.range}</Text>
      </View>
    </View>
  </View>
);

/** S44 three stat tiles: START / NOW / TO GO. */
export const GoalStats = ({ stats }: { readonly stats: NonNullable<GoalView["stats"]> }) => (
  <View style={styles.stats}>
    {stats.map((s) => (
      <View key={s.label} style={styles.stat}>
        <CapsLabel>{s.label}</CapsLabel>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>
          {s.value}
        </Text>
        <Text numberOfLines={1} style={styles.statDetail}>
          {s.detail}
        </Text>
      </View>
    ))}
  </View>
);

const bodyMd = { fontFamily: font.body, fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line } as const;
const bodySm = { fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line } as const;

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  barTitle: { color: color.onSurface },
  spacer: { width: 40 },
  eyebrowRow: { marginTop: space.md, flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryContainer },
  headRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  headline: {
    flexShrink: 1,
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: type.headlineLg.size * type.headlineLg.tracking,
    color: color.onSurface,
  },
  sub: { ...bodyMd, marginTop: 4, color: color.onSurfaceVariant },
  notice: { ...bodySm, marginTop: 8, color: color.secondary },
  card: {
    backgroundColor: color.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  chartCard: { marginTop: space.xl, padding: space.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  bright: { color: color.onSurface },
  titleShrink: { flexShrink: 1 },
  /** Never clipped (QA R17): the caption keeps its width; the title side shrinks. */
  caption: { flexShrink: 0, fontFamily: font.label, fontSize: type.labelMd.size, lineHeight: type.labelMd.line, color: color.onSurfaceVariant },
  chart: { marginTop: 12 },
  legend: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.surfaceContainerHigh,
    flexDirection: "row",
    gap: space.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 16, height: 2.5, borderRadius: 2, backgroundColor: color.primaryContainer },
  legendDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.onSurfaceVariant },
  legendSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: color.secondary, opacity: 0.4 },
  legendText: { ...bodySm, color: color.onSurfaceVariant },
  stats: { marginTop: space.xl, flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  statValue: {
    marginTop: 6,
    fontFamily: font.label,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  statDetail: { ...bodySm, marginTop: 2, color: color.onSurfaceVariant },
});
