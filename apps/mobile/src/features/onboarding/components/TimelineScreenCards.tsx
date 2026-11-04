import { Pressable, StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { GoalChart } from "@/features/goal/chart/GoalChart";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui";

import type { TimelineMilestoneRow, TimelineRow, TimelineView } from "../timeline-view";

const c = goalCopy.onboarding;

/** S43 chart card: title + pace, onboarding `GoalChart`, three stat columns. */
export const TimelineChartCard = ({ view }: { readonly view: TimelineView }) => (
  <View style={[styles.card, styles.chartCard]}>
    <View style={styles.between}>
      <CapsLabel>{c.chartTitle}</CapsLabel>
      <Text style={styles.pace}>{view.paceLine}</Text>
    </View>
    {view.chart ? (
      <View style={styles.chart}>
        <GoalChart
          data={view.chart.data}
          variant="onboarding"
          etaWeeks={view.chart.etaWeeks}
          accessibilityLabel={view.chart.a11y}
        />
      </View>
    ) : null}
    <View style={styles.stats}>
      {view.stats.map((s, i) => (
        <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
          <CapsLabel>{s.label}</CapsLabel>
          <Text style={styles.statValue}>{s.value}</Text>
        </View>
      ))}
    </View>
  </View>
);

/** S43 milestones: hollow lavender dots joined by a hairline, lime dot for the goal. */
export const TimelineMilestones = ({ rows }: { readonly rows: readonly TimelineMilestoneRow[] }) => (
  <View style={styles.section}>
    <CapsLabel>{c.milestonesTitle}</CapsLabel>
    <View style={[styles.card, styles.listCard]}>
      {rows.length > 1 ? <View style={styles.connector} /> : null}
      {rows.map((m, i) => (
        <View key={m.id} style={[styles.row, i > 0 && styles.rowDivider]}>
          <View style={styles.rowLeft}>
            <View style={[styles.dot, m.final ? styles.dotFinal : styles.dotOpen]} />
            <View style={styles.shrink}>
              <Text style={styles.rowTitle}>{m.title}</Text>
              {m.detail ? <Text style={styles.rowDetail}>{m.detail}</Text> : null}
            </View>
          </View>
          {m.date ? <Text style={styles.rowDate}>{m.date}</Text> : null}
        </View>
      ))}
    </View>
  </View>
);

/** S43 "What you picked" summary + right-aligned lime "Edit answers". */
export const TimelinePicked = ({ rows, onEdit }: { readonly rows: readonly TimelineRow[]; readonly onEdit: () => void }) => (
  <View style={styles.section}>
    <CapsLabel>{c.pickedTitle}</CapsLabel>
    <View style={[styles.card, styles.listCard]}>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Text style={styles.rowTitle}>{r.label}</Text>
          <Text numberOfLines={1} style={[styles.pickedValue, styles.shrink]}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
    <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={8} style={styles.edit}>
      <Text style={styles.editText}>{c.editAnswers}</Text>
    </Pressable>
  </View>
);

const body = { fontFamily: font.body, fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line } as const;
const label12 = { fontFamily: font.label, fontSize: type.bodySm.size, lineHeight: type.bodySm.line } as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  chartCard: { marginTop: space.xl, padding: space.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  pace: { ...label12, color: color.secondary },
  chart: { marginTop: 12 },
  stats: {
    flexDirection: "row",
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.surfaceContainerHigh,
  },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: space.xs },
  statDivider: { borderLeftWidth: 1, borderLeftColor: color.outlineVariant },
  statValue: {
    marginTop: space.xs,
    textAlign: "center",
    fontFamily: font.label,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  section: { marginTop: space.xl },
  listCard: { marginTop: 12, paddingHorizontal: space.md, paddingVertical: space.xs },
  connector: {
    position: "absolute",
    left: space.md + 4.5,
    top: 30,
    bottom: 30,
    width: 1,
    backgroundColor: color.outlineVariant,
  },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: color.surfaceContainerHigh },
  rowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  shrink: { flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  dotOpen: { borderWidth: 1, borderColor: color.secondary, backgroundColor: color.surfaceContainerLow },
  dotFinal: { backgroundColor: color.primaryContainer },
  rowTitle: { ...body, color: color.onSurface },
  rowDetail: { fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line, color: color.onSurfaceVariant },
  rowDate: { ...label12, color: color.onSurface },
  pickedValue: { ...body, color: color.onSurfaceVariant, textAlign: "right" },
  edit: { alignSelf: "flex-end", marginTop: 10 },
  editText: { ...label12, color: color.primaryContainer },
});
