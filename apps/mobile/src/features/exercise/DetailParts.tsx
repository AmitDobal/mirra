import { Zap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

import type { CatalogEntry } from "./catalog";

type Metric = { readonly value: string; readonly unit?: string; readonly label: string; readonly tone: string };

type PrescriptionProps = {
  readonly sets: number;
  readonly reps: string;
  readonly loadKg: number | null;
  readonly restSec: number;
  readonly caption: string;
};

/** S26 "Today's target prescription": sets / reps / load / rest. */
export const PrescriptionCard = ({ sets, reps, loadKg, restSec, caption }: PrescriptionProps) => {
  const metrics: Metric[] = [
    { value: String(sets), label: "Sets", tone: color.onSurface },
    { value: reps, label: "Reps", tone: color.primaryFixed },
    { value: loadKg ? String(loadKg) : "—", unit: loadKg ? "kg" : undefined, label: "Target", tone: color.onSurface },
    { value: String(restSec), unit: "s", label: "Rest", tone: color.secondary },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel}>Today&apos;s target prescription</Text>
        <View style={styles.cycle}>
          <Text style={styles.cycleText}>{caption}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        {metrics.map((m, i) => (
          <View key={m.label} style={[styles.metric, i > 0 ? styles.metricDivider : null]}>
            <Text style={[styles.metricValue, { color: m.tone }]} numberOfLines={1}>
              {m.value}
              {m.unit ? <Text style={styles.metricUnit}> {m.unit}</Text> : null}
            </Text>
            <Text style={styles.metricLabel}>{m.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/** S26 coach form cue box. */
export const CoachCue = ({ cue }: { readonly cue: string }) => (
  <View style={styles.cue}>
    <View style={styles.cueIcon}>
      <Zap size={16} color={color.secondary} />
    </View>
    <View style={styles.flex1}>
      <View style={styles.cueHead}>
        <Text style={styles.cueLabel}>COACH FORM CUE</Text>
        <Text style={styles.cueSource}>Mirra</Text>
      </View>
      <Text style={styles.cueText}>{cue}</Text>
    </View>
  </View>
);

/** S26 "Execution protocol": numbered how-to steps. */
export const StepsList = ({ steps }: { readonly steps: CatalogEntry["steps"] }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>HOW TO</Text>
      <Text style={styles.sectionNote}>{steps.length} steps</Text>
    </View>
    {steps.map((step, i) => (
      <View key={step.title} style={styles.step}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{i + 1}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
        </View>
      </View>
    ))}
  </View>
);

/** S26 target musculature bars (first bar lime, rest lavender). */
export const MuscleBars = ({ muscles }: { readonly muscles: CatalogEntry["muscles"] }) => {
  if (muscles.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel}>Target musculature</Text>
        <Text style={styles.primaryFocus}>PRIMARY FOCUS</Text>
      </View>
      {muscles.map((m, i) => (
        <View key={m.name} style={styles.bar}>
          <View style={styles.barHead}>
            <Text style={styles.barName} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={[styles.barPct, { color: i === 0 ? color.primaryFixed : color.secondary }]}>
              {m.pct}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${m.pct}%`, backgroundColor: i === 0 ? color.primaryFixed : color.secondary },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardLabel: { flexShrink: 1, fontFamily: font.label, fontSize: 10, letterSpacing: 0.6, color: color.onSurfaceVariant, textTransform: "uppercase" },
  cycle: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.onPrimaryFixedVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: color.onPrimaryFixed,
  },
  cycleText: { fontFamily: font.label, fontSize: 10, color: color.primaryFixed },
  metrics: { flexDirection: "row" },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: color.outlineVariant },
  metricValue: { fontFamily: font.headline, fontSize: 24, lineHeight: 30 },
  metricUnit: { fontFamily: font.label, fontSize: 11, color: color.onSurfaceVariant },
  metricLabel: { fontFamily: font.label, fontSize: 9, letterSpacing: 1, color: color.onSurfaceVariant },
  cue: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.secondaryContainer,
    backgroundColor: color.surfaceContainerLow,
  },
  cueIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.secondaryContainer,
  },
  cueHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  cueLabel: { fontFamily: font.labelBold, fontSize: 10, letterSpacing: 0.8, color: color.secondary },
  cueSource: { fontFamily: font.label, fontSize: 10, color: color.onSurfaceVariant },
  cueText: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 19, color: color.onSurface },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: font.labelBold, fontSize: 12, letterSpacing: 1, color: color.onSurface },
  sectionNote: { fontFamily: font.label, fontSize: 10, color: color.onSurfaceVariant },
  step: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceContainerHigh,
  },
  stepNumText: { fontFamily: font.labelBold, fontSize: 11, color: color.primaryFixed },
  stepTitle: { fontFamily: font.headlineSemi, fontSize: 13, color: color.onSurface },
  stepBody: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.onSurfaceVariant, marginTop: 2 },
  primaryFocus: { fontFamily: font.labelBold, fontSize: 10, color: color.primaryFixed },
  bar: { gap: 5 },
  barHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  barName: { flex: 1, fontFamily: font.bodyMedium, fontSize: 12, color: color.onSurface },
  barPct: { fontFamily: font.labelBold, fontSize: 11 },
  track: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: color.surfaceContainerHighest },
  fill: { height: 4, borderRadius: 2 },
});
