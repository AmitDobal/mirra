import { Zap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

import type { CatalogEntry } from "./catalog";
import type { MuscleBar } from "./exercise-muscles";

type PrescriptionProps = {
  readonly sets: number;
  readonly reps: string;
  readonly loadKg: number | null;
  readonly restSec: number;
  /** Load shown in the user's unit ("175" / "LB TARGET"). */
  readonly unit: "kg" | "lb";
};

const KG_PER_LB = 0.45359237;

/** S36 prescription card: sets / reps / target load / rest in four columns. */
export const PrescriptionCard = ({ sets, reps, loadKg, restSec, unit }: PrescriptionProps) => {
  const load = loadKg ? Math.round(unit === "kg" ? loadKg : loadKg / KG_PER_LB) : null;
  const metrics = [
    { value: String(sets), label: "Sets" },
    { value: reps, label: "Reps" },
    { value: load ? String(load) : "—", label: `${unit} target` },
    { value: `${restSec}s`, label: "Rest" },
  ];
  return (
    <View style={styles.metrics}>
      {metrics.map((m, i) => (
        <View key={m.label} style={[styles.metric, i > 0 ? styles.metricDivider : null]}>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {m.value}
          </Text>
          <Text style={styles.metricLabel} numberOfLines={1}>
            {m.label.toUpperCase()}
          </Text>
        </View>
      ))}
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

/** S36 "Execution protocol": numbered how-to steps. */
export const StepsList = ({ steps }: { readonly steps: CatalogEntry["steps"] }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Execution protocol</Text>
    {steps.map((step, i) => (
      <View key={step.title} style={styles.step}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{i + 1}</Text>
        </View>
        <View style={styles.stepCopy}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
        </View>
      </View>
    ))}
  </View>
);

/** S26 target musculature bars (first bar lime, rest lavender). */
export const MuscleBars = ({ muscles }: { readonly muscles: readonly MuscleBar[] }) => {
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
  metrics: {
    flexDirection: "row",
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  metric: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: color.surfaceContainerHigh },
  metricValue: { fontFamily: font.headline, fontSize: 24, lineHeight: 28, color: color.onSurface },
  metricLabel: {
    marginTop: 4,
    fontFamily: font.labelBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: color.onSurfaceVariant,
  },
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
  sectionTitle: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  stepNumText: { fontFamily: font.headline, fontSize: 12, color: color.onSurface },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { fontFamily: font.headlineSemi, fontSize: 14, lineHeight: 20, color: color.onSurface },
  stepBody: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: color.onSurfaceVariant },
  primaryFocus: { fontFamily: font.labelBold, fontSize: 10, color: color.primaryFixed },
  bar: { gap: 5 },
  barHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  barName: { flex: 1, fontFamily: font.bodyMedium, fontSize: 12, color: color.onSurface },
  barPct: { fontFamily: font.labelBold, fontSize: 11 },
  track: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: color.surfaceContainerHighest },
  fill: { height: 4, borderRadius: 2 },
});
